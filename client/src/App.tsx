import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Star, User, Building } from 'lucide-react';
import { trpc } from '@/utils/trpc';

// Import types
import type { InfluencerProfile } from '../../server/src/schema';
import type { UserProfileResponse } from '../../server/src/handlers/get_user_profile';

// Import components
import { ProfileSetup } from '@/components/ProfileSetup';
import { InfluencerBrowser } from '@/components/InfluencerBrowser';
import { MessagingSystem } from '@/components/MessagingSystem';
import { ReviewSystem } from '@/components/ReviewSystem';
import { ProfileManager } from '@/components/ProfileManager';

function App() {
  const [currentUser, setCurrentUser] = useState<UserProfileResponse | null>(null);
  const [selectedInfluencer, setSelectedInfluencer] = useState<InfluencerProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'messages' | 'profile'>('discover');
  const [isLoading, setIsLoading] = useState(false);

  // Current user ID - in a real app, this would come from authentication
  const currentUserId = 1;

  const loadCurrentUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const userProfile = await trpc.getUserProfile.query({ user_id: currentUserId });
      setCurrentUser(userProfile);
    } catch (error) {
      console.error('Failed to load user profile:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentUser();
  }, [loadCurrentUser]);

  const handleProfileComplete = () => {
    // Refresh user profile after setup
    loadCurrentUser();
  };

  const handleInfluencerSelect = (influencer: InfluencerProfile) => {
    setSelectedInfluencer(influencer);
    setActiveTab('messages');
  };

  const handleBackToDiscover = () => {
    setSelectedInfluencer(null);
    setActiveTab('discover');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  // Show profile setup if user doesn't have a profile yet
  const hasProfile = currentUser && (currentUser.brandProfile || currentUser.influencerProfile);
  if (!hasProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
        <ProfileSetup 
          currentUser={currentUser} 
          onComplete={handleProfileComplete} 
        />
      </div>
    );
  }

  const userType = currentUser?.user.user_type;
  const isBrand = userType === 'brand';

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-2">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                InfluenceConnect
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <Badge 
                variant={isBrand ? "default" : "secondary"}
                className={isBrand ? "bg-blue-100 text-blue-800" : "bg-purple-100 text-purple-800"}
              >
                {isBrand ? (
                  <>
                    <Building className="h-3 w-3 mr-1" />
                    Brand
                  </>
                ) : (
                  <>
                    <Star className="h-3 w-3 mr-1" />
                    Influencer
                  </>
                )}
              </Badge>
              
              <div className="text-sm text-gray-600">
                {isBrand 
                  ? currentUser?.brandProfile?.company_name 
                  : currentUser?.influencerProfile?.display_name
                }
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'discover' | 'messages' | 'profile')}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="discover" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>{isBrand ? 'Discover Influencers' : 'My Profile'}</span>
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex items-center space-x-2">
              <MessageCircle className="h-4 w-4" />
              <span>Messages</span>
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center space-x-2">
              <User className="h-4 w-4" />
              <span>Profile Settings</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="discover">
            {isBrand ? (
              <InfluencerBrowser
                currentUser={currentUser}
                onInfluencerSelect={handleInfluencerSelect}
                onStartConversation={handleInfluencerSelect}
              />
            ) : (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Star className="h-5 w-5 text-yellow-500" />
                      <span>My Reviews</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ReviewSystem
                      influencerId={currentUser?.user.id || 0}
                      isViewOnly={true}
                    />
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          <TabsContent value="messages">
            <MessagingSystem
              currentUser={currentUser}
              selectedInfluencer={selectedInfluencer}
              onBackToDiscover={isBrand ? handleBackToDiscover : undefined}
            />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileManager
              currentUser={currentUser}
              onProfileUpdate={loadCurrentUser}
            />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

export default App;