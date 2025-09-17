import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Building, Star, User, Save, Camera, Globe, Instagram, Youtube, Users, TrendingUp } from 'lucide-react';
import { trpc } from '@/utils/trpc';

import type { UserProfileResponse } from '../../../server/src/handlers/get_user_profile';
import type { UpdateBrandProfileInput, UpdateInfluencerProfileInput } from '../../../server/src/schema';

interface ProfileManagerProps {
  currentUser: UserProfileResponse | null;
  onProfileUpdate: () => void;
}

export function ProfileManager({ currentUser, onProfileUpdate }: ProfileManagerProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Brand profile form
  const [brandForm, setBrandForm] = useState<Omit<UpdateBrandProfileInput, 'user_id'>>({
    company_name: currentUser?.brandProfile?.company_name || '',
    description: currentUser?.brandProfile?.description || '',
    website: currentUser?.brandProfile?.website || '',
    industry: currentUser?.brandProfile?.industry || '',
    logo_url: currentUser?.brandProfile?.logo_url || ''
  });

  // Influencer profile form
  const [influencerForm, setInfluencerForm] = useState<Omit<UpdateInfluencerProfileInput, 'user_id'>>({
    display_name: currentUser?.influencerProfile?.display_name || '',
    bio: currentUser?.influencerProfile?.bio || '',
    avatar_url: currentUser?.influencerProfile?.avatar_url || '',
    instagram_handle: currentUser?.influencerProfile?.instagram_handle || '',
    tiktok_handle: currentUser?.influencerProfile?.tiktok_handle || '',
    youtube_handle: currentUser?.influencerProfile?.youtube_handle || '',
    follower_count: currentUser?.influencerProfile?.follower_count,
    engagement_rate: currentUser?.influencerProfile?.engagement_rate,
    category: currentUser?.influencerProfile?.category || ''
  });

  if (!currentUser) {
    return (
      <div className="text-center py-8">
        <User className="h-12 w-12 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-600">Unable to load profile data</p>
      </div>
    );
  }

  const isBrand = currentUser.user.user_type === 'brand';
  const profile = isBrand ? currentUser.brandProfile : currentUser.influencerProfile;

  const handleSaveProfile = async () => {
    if (!profile) return;

    setIsLoading(true);
    try {
      if (isBrand) {
        const updateData: UpdateBrandProfileInput = {
          ...brandForm,
          user_id: currentUser.user.id,
          description: brandForm.description || null,
          website: brandForm.website || null,
          industry: brandForm.industry || null,
          logo_url: brandForm.logo_url || null
        };
        await trpc.updateBrandProfile.mutate(updateData);
      } else {
        const updateData: UpdateInfluencerProfileInput = {
          ...influencerForm,
          user_id: currentUser.user.id,
          bio: influencerForm.bio || null,
          avatar_url: influencerForm.avatar_url || null,
          instagram_handle: influencerForm.instagram_handle || null,
          tiktok_handle: influencerForm.tiktok_handle || null,
          youtube_handle: influencerForm.youtube_handle || null,
          follower_count: influencerForm.follower_count,
          engagement_rate: influencerForm.engagement_rate,
          category: influencerForm.category || null
        };
        await trpc.updateInfluencerProfile.mutate(updateData);
      }

      setIsEditing(false);
      onProfileUpdate();
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset forms to original values
    if (isBrand) {
      setBrandForm({
        company_name: currentUser.brandProfile?.company_name || '',
        description: currentUser.brandProfile?.description || '',
        website: currentUser.brandProfile?.website || '',
        industry: currentUser.brandProfile?.industry || '',
        logo_url: currentUser.brandProfile?.logo_url || ''
      });
    } else {
      setInfluencerForm({
        display_name: currentUser.influencerProfile?.display_name || '',
        bio: currentUser.influencerProfile?.bio || '',
        avatar_url: currentUser.influencerProfile?.avatar_url || '',
        instagram_handle: currentUser.influencerProfile?.instagram_handle || '',
        tiktok_handle: currentUser.influencerProfile?.tiktok_handle || '',
        youtube_handle: currentUser.influencerProfile?.youtube_handle || '',
        follower_count: currentUser.influencerProfile?.follower_count,
        engagement_rate: currentUser.influencerProfile?.engagement_rate,
        category: currentUser.influencerProfile?.category || ''
      });
    }
    setIsEditing(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((word: string) => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-4">
              <div className="relative">
                <Avatar className="h-20 w-20">
                  <AvatarImage 
                    src={isBrand ? currentUser.brandProfile?.logo_url || '' : currentUser.influencerProfile?.avatar_url || ''} 
                  />
                  <AvatarFallback className={`text-xl font-bold text-white ${
                    isBrand 
                      ? 'bg-gradient-to-r from-blue-600 to-cyan-600' 
                      : 'bg-gradient-to-r from-purple-600 to-pink-600'
                  }`}>
                    {isBrand ? (
                      currentUser.brandProfile?.company_name 
                        ? getInitials(currentUser.brandProfile.company_name)
                        : <Building className="h-8 w-8" />
                    ) : (
                      currentUser.influencerProfile?.display_name 
                        ? getInitials(currentUser.influencerProfile.display_name)
                        : <Star className="h-8 w-8" />
                    )}
                  </AvatarFallback>
                </Avatar>
                {isEditing && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h1 className="text-2xl font-bold text-gray-900">
                    {isBrand 
                      ? currentUser.brandProfile?.company_name || 'Brand Profile'
                      : currentUser.influencerProfile?.display_name || 'Influencer Profile'
                    }
                  </h1>
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
                </div>
                
                <p className="text-gray-600 mb-3">
                  {isBrand 
                    ? currentUser.brandProfile?.description || 'No description provided'
                    : currentUser.influencerProfile?.bio || 'No bio provided'
                  }
                </p>
                
                <div className="flex flex-wrap gap-2">
                  {isBrand ? (
                    <>
                      {currentUser.brandProfile?.industry && (
                        <Badge variant="outline">{currentUser.brandProfile.industry}</Badge>
                      )}
                      {currentUser.brandProfile?.website && (
                        <Badge variant="outline" className="text-blue-600 border-blue-200">
                          <Globe className="h-3 w-3 mr-1" />
                          Website
                        </Badge>
                      )}
                    </>
                  ) : (
                    <>
                      {currentUser.influencerProfile?.category && (
                        <Badge variant="outline">{currentUser.influencerProfile.category}</Badge>
                      )}
                      {currentUser.influencerProfile?.instagram_handle && (
                        <Badge variant="outline" className="text-pink-600 border-pink-200">
                          <Instagram className="h-3 w-3 mr-1" />
                          Instagram
                        </Badge>
                      )}
                      {currentUser.influencerProfile?.youtube_handle && (
                        <Badge variant="outline" className="text-red-600 border-red-200">
                          <Youtube className="h-3 w-3 mr-1" />
                          YouTube
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              {isEditing ? (
                <>
                  <Button variant="outline" onClick={handleCancelEdit}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveProfile} disabled={isLoading}>
                    <Save className="h-4 w-4 mr-2" />
                    {isLoading ? 'Saving...' : 'Save Changes'}
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>
                  <User className="h-4 w-4 mr-2" />
                  Edit Profile
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Profile Stats (Influencers only) */}
      {!isBrand && currentUser.influencerProfile && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {currentUser.influencerProfile.follower_count && (
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-purple-600 mb-1">
                  {formatFollowers(currentUser.influencerProfile.follower_count)}
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center">
                  <Users className="h-4 w-4 mr-1" />
                  Total Followers
                </div>
              </CardContent>
            </Card>
          )}
          
          {currentUser.influencerProfile.engagement_rate && (
            <Card>
              <CardContent className="pt-6 text-center">
                <div className="text-3xl font-bold text-green-600 mb-1">
                  {currentUser.influencerProfile.engagement_rate.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  Engagement Rate
                </div>
              </CardContent>
            </Card>
          )}
          
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-1">
                {currentUser.influencerProfile.created_at.toLocaleDateString('en-US', { year: 'numeric' })}
              </div>
              <div className="text-sm text-gray-600">
                Member Since
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Profile Details */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-6">
              {isBrand ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="company_name">Company Name *</Label>
                      <Input
                        id="company_name"
                        value={brandForm.company_name || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setBrandForm(prev => ({ ...prev, company_name: e.target.value }))
                        }
                        placeholder="Your company name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={brandForm.industry || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setBrandForm(prev => ({ ...prev, industry: e.target.value || null }))
                        }
                        placeholder="e.g., Fashion, Tech, Food"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Company Description</Label>
                    <Textarea
                      id="description"
                      value={brandForm.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setBrandForm(prev => ({ ...prev, description: e.target.value || null }))
                      }
                      placeholder="Tell influencers about your brand, values, and collaboration opportunities"
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        type="url"
                        value={brandForm.website || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setBrandForm(prev => ({ ...prev, website: e.target.value || null }))
                        }
                        placeholder="https://your-website.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="logo_url">Logo URL</Label>
                      <Input
                        id="logo_url"
                        type="url"
                        value={brandForm.logo_url || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setBrandForm(prev => ({ ...prev, logo_url: e.target.value || null }))
                        }
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="display_name">Display Name *</Label>
                      <Input
                        id="display_name"
                        value={influencerForm.display_name || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setInfluencerForm(prev => ({ ...prev, display_name: e.target.value }))
                        }
                        placeholder="Your creator name"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Input
                        id="category"
                        value={influencerForm.category || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setInfluencerForm(prev => ({ ...prev, category: e.target.value || null }))
                        }
                        placeholder="e.g., Fashion, Fitness, Travel"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="bio">Bio</Label>
                    <Textarea
                      id="bio"
                      value={influencerForm.bio || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setInfluencerForm(prev => ({ ...prev, bio: e.target.value || null }))
                      }
                      placeholder="Tell brands about your content style, audience, and collaboration interests"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label htmlFor="avatar_url">Avatar URL</Label>
                    <Input
                      id="avatar_url"
                      type="url"
                      value={influencerForm.avatar_url || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setInfluencerForm(prev => ({ ...prev, avatar_url: e.target.value || null }))
                      }
                      placeholder="https://example.com/avatar.jpg"
                    />
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="instagram_handle">Instagram Handle</Label>
                      <Input
                        id="instagram_handle"
                        value={influencerForm.instagram_handle || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setInfluencerForm(prev => ({ ...prev, instagram_handle: e.target.value || null }))
                        }
                        placeholder="@username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="tiktok_handle">TikTok Handle</Label>
                      <Input
                        id="tiktok_handle"
                        value={influencerForm.tiktok_handle || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setInfluencerForm(prev => ({ ...prev, tiktok_handle: e.target.value || null }))
                        }
                        placeholder="@username"
                      />
                    </div>
                    <div>
                      <Label htmlFor="youtube_handle">YouTube Handle</Label>
                      <Input
                        id="youtube_handle"
                        value={influencerForm.youtube_handle || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setInfluencerForm(prev => ({ ...prev, youtube_handle: e.target.value || null }))
                        }
                        placeholder="@channel"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="follower_count">Total Followers</Label>
                      <Input
                        id="follower_count"
                        type="number"
                        value={influencerForm.follower_count || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setInfluencerForm(prev => ({ ...prev, follower_count: e.target.value ? parseInt(e.target.value) : null }))
                        }
                        placeholder="50000"
                        min="0"
                      />
                    </div>
                    <div>
                      <Label htmlFor="engagement_rate">Engagement Rate (%)</Label>
                      <Input
                        id="engagement_rate"
                        type="number"
                        step="0.1"
                        value={influencerForm.engagement_rate || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setInfluencerForm(prev => ({ ...prev, engagement_rate: e.target.value ? parseFloat(e.target.value) : null }))
                        }
                        placeholder="3.5"
                        min="0"
                        max="100"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Email</Label>
                  <p className="text-gray-900">{currentUser.user.email}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Member Since</Label>
                  <p className="text-gray-900">
                    {currentUser.user.created_at.toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>

              {/* Profile-specific read-only fields */}
              {isBrand && currentUser.brandProfile && (
                <div className="space-y-4">
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {currentUser.brandProfile.industry && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Industry</Label>
                        <p className="text-gray-900">{currentUser.brandProfile.industry}</p>
                      </div>
                    )}
                    {currentUser.brandProfile.website && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Website</Label>
                        <a 
                          href={currentUser.brandProfile.website} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:text-blue-800 underline"
                        >
                          {currentUser.brandProfile.website}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!isBrand && currentUser.influencerProfile && (
                <div className="space-y-4">
                  <Separator />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {(currentUser.influencerProfile.instagram_handle || 
                      currentUser.influencerProfile.tiktok_handle || 
                      currentUser.influencerProfile.youtube_handle) && (
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Social Platforms</Label>
                        <div className="space-y-1">
                          {currentUser.influencerProfile.instagram_handle && (
                            <p className="text-gray-900 flex items-center">
                              <Instagram className="h-4 w-4 mr-2 text-pink-600" />
                              {currentUser.influencerProfile.instagram_handle}
                            </p>
                          )}
                          {currentUser.influencerProfile.youtube_handle && (
                            <p className="text-gray-900 flex items-center">
                              <Youtube className="h-4 w-4 mr-2 text-red-600" />
                              {currentUser.influencerProfile.youtube_handle}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}