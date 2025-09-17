import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Search, MessageCircle, Star, Users, TrendingUp, Instagram, Youtube } from 'lucide-react';
import { trpc } from '@/utils/trpc';

import type { InfluencerProfile } from '../../../server/src/schema';
import type { UserProfileResponse } from '../../../server/src/handlers/get_user_profile';
import { ReviewSystem } from './ReviewSystem';

interface InfluencerBrowserProps {
  currentUser: UserProfileResponse | null;
  onInfluencerSelect: (influencer: InfluencerProfile) => void;
  onStartConversation: (influencer: InfluencerProfile) => void;
}

export function InfluencerBrowser({ currentUser, onStartConversation }: InfluencerBrowserProps) {
  const [influencers, setInfluencers] = useState<InfluencerProfile[]>([]);
  const [filteredInfluencers, setFilteredInfluencers] = useState<InfluencerProfile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadInfluencers = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getInfluencerProfiles.query();
      setInfluencers(result);
      setFilteredInfluencers(result);
    } catch (error) {
      console.error('Failed to load influencers:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInfluencers();
  }, [loadInfluencers]);

  // Filter influencers based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredInfluencers(influencers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = influencers.filter((influencer: InfluencerProfile) => 
      influencer.display_name.toLowerCase().includes(query) ||
      (influencer.bio && influencer.bio.toLowerCase().includes(query)) ||
      (influencer.category && influencer.category.toLowerCase().includes(query)) ||
      (influencer.instagram_handle && influencer.instagram_handle.toLowerCase().includes(query)) ||
      (influencer.tiktok_handle && influencer.tiktok_handle.toLowerCase().includes(query)) ||
      (influencer.youtube_handle && influencer.youtube_handle.toLowerCase().includes(query))
    );
    setFilteredInfluencers(filtered);
  }, [searchQuery, influencers]);

  const formatFollowers = (count: number | null) => {
    if (!count) return 'N/A';
    if (count >= 1000000) {
      return `${(count / 1000000).toFixed(1)}M`;
    }
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K`;
    }
    return count.toString();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word: string) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleViewProfile = () => {
    // Profile viewing is handled by the dialog
  };

  const handleStartConversation = (influencer: InfluencerProfile) => {
    onStartConversation(influencer);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Discovering amazing influencers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Search */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Discover Influencers</h2>
          <p className="text-gray-600 mt-1">Find the perfect creators for your brand collaborations</p>
        </div>
        
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by name, category, or social handle..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          {filteredInfluencers.length} influencer{filteredInfluencers.length !== 1 ? 's' : ''} found
        </p>
      </div>

      {/* Influencer Grid */}
      {filteredInfluencers.length === 0 ? (
        <div className="text-center py-12">
          <Star className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No influencers found' : 'No influencers available'}
          </h3>
          <p className="text-gray-600">
            {searchQuery ? 'Try adjusting your search terms' : 'Check back later for new creators'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredInfluencers.map((influencer: InfluencerProfile) => (
            <Card key={influencer.id} className="hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-4">
                <div className="flex items-start space-x-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={influencer.avatar_url || ''} />
                    <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold">
                      {getInitials(influencer.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {influencer.display_name}
                    </h3>
                    {influencer.category && (
                      <Badge variant="secondary" className="mt-1">
                        {influencer.category}
                      </Badge>
                    )}
                  </div>
                </div>

                {influencer.bio && (
                  <p className="text-sm text-gray-600 mt-3 line-clamp-2">
                    {influencer.bio}
                  </p>
                )}
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {influencer.follower_count && (
                      <div className="flex items-center space-x-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          {formatFollowers(influencer.follower_count)} followers
                        </span>
                      </div>
                    )}
                    
                    {influencer.engagement_rate && (
                      <div className="flex items-center space-x-2">
                        <TrendingUp className="h-4 w-4 text-gray-400" />
                        <span className="text-gray-600">
                          {influencer.engagement_rate.toFixed(1)}% engagement
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Social handles */}
                  <div className="flex flex-wrap gap-2">
                    {influencer.instagram_handle && (
                      <Badge variant="outline" className="text-pink-600 border-pink-200">
                        <Instagram className="h-3 w-3 mr-1" />
                        {influencer.instagram_handle}
                      </Badge>
                    )}
                    {influencer.youtube_handle && (
                      <Badge variant="outline" className="text-red-600 border-red-200">
                        <Youtube className="h-3 w-3 mr-1" />
                        {influencer.youtube_handle}
                      </Badge>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex space-x-2 pt-2">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={handleViewProfile}
                        >
                          <Star className="h-4 w-4 mr-2" />
                          View Profile
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle className="flex items-center space-x-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={influencer.avatar_url || ''} />
                              <AvatarFallback className="bg-gradient-to-r from-purple-600 to-pink-600 text-white">
                                {getInitials(influencer.display_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div>{influencer.display_name}</div>
                              {influencer.category && (
                                <Badge variant="secondary" className="mt-1">
                                  {influencer.category}
                                </Badge>
                              )}
                            </div>
                          </DialogTitle>
                        </DialogHeader>
                        
                        <div className="space-y-6">
                          {influencer.bio && (
                            <div>
                              <h4 className="font-medium mb-2">About</h4>
                              <p className="text-gray-600">{influencer.bio}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            {influencer.follower_count && (
                              <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-purple-600">
                                  {formatFollowers(influencer.follower_count)}
                                </div>
                                <div className="text-sm text-gray-600">Followers</div>
                              </div>
                            )}
                            
                            {influencer.engagement_rate && (
                              <div className="text-center p-4 bg-gray-50 rounded-lg">
                                <div className="text-2xl font-bold text-green-600">
                                  {influencer.engagement_rate.toFixed(1)}%
                                </div>
                                <div className="text-sm text-gray-600">Engagement</div>
                              </div>
                            )}
                          </div>

                          {/* Social handles */}
                          {(influencer.instagram_handle || influencer.tiktok_handle || influencer.youtube_handle) && (
                            <div>
                              <h4 className="font-medium mb-2">Social Platforms</h4>
                              <div className="space-y-2">
                                {influencer.instagram_handle && (
                                  <div className="flex items-center space-x-2 text-sm">
                                    <Instagram className="h-4 w-4 text-pink-600" />
                                    <span>Instagram: {influencer.instagram_handle}</span>
                                  </div>
                                )}
                                {influencer.youtube_handle && (
                                  <div className="flex items-center space-x-2 text-sm">
                                    <Youtube className="h-4 w-4 text-red-600" />
                                    <span>YouTube: {influencer.youtube_handle}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          <Separator />

                          {/* Reviews section */}
                          <div>
                            <h4 className="font-medium mb-4">Reviews & Ratings</h4>
                            <ReviewSystem
                              influencerId={influencer.user_id}
                              currentUser={currentUser}
                              isViewOnly={true}
                            />
                          </div>

                          {/* Action buttons */}
                          <div className="flex space-x-3 pt-4">
                            <Button
                              onClick={() => handleStartConversation(influencer)}
                              className="flex-1"
                            >
                              <MessageCircle className="h-4 w-4 mr-2" />
                              Start Conversation
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>

                    <Button 
                      size="sm" 
                      onClick={() => handleStartConversation(influencer)}
                      className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Message
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}