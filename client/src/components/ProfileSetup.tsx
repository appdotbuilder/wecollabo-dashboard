import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Building, Star, UserPlus } from 'lucide-react';
import { trpc } from '@/utils/trpc';

import type { UserProfileResponse } from '../../../server/src/handlers/get_user_profile';
import type { CreateBrandProfileInput, CreateInfluencerProfileInput, CreateUserInput, UserType } from '../../../server/src/schema';

interface ProfileSetupProps {
  currentUser: UserProfileResponse | null;
  onComplete: () => void;
}

export function ProfileSetup({ currentUser, onComplete }: ProfileSetupProps) {
  const [step, setStep] = useState<'user' | 'profile'>('user');
  const [isLoading, setIsLoading] = useState(false);
  const [userType, setUserType] = useState<UserType>('brand');
  
  // User creation form
  const [userForm, setUserForm] = useState<CreateUserInput>({
    email: '',
    password: '',
    user_type: 'brand'
  });

  // Brand profile form
  const [brandForm, setBrandForm] = useState<Omit<CreateBrandProfileInput, 'user_id'>>({
    company_name: '',
    description: '',
    website: '',
    industry: '',
    logo_url: ''
  });

  // Influencer profile form
  const [influencerForm, setInfluencerForm] = useState<Omit<CreateInfluencerProfileInput, 'user_id'>>({
    display_name: '',
    bio: '',
    avatar_url: '',
    instagram_handle: '',
    tiktok_handle: '',
    youtube_handle: '',
    follower_count: null,
    engagement_rate: null,
    category: ''
  });

  const handleUserTypeChange = (value: UserType) => {
    setUserType(value);
    setUserForm(prev => ({ ...prev, user_type: value }));
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
      // User already exists, just proceed to profile creation
      setStep('profile');
      return;
    }

    setIsLoading(true);
    try {
      await trpc.createUser.mutate(userForm);
      setStep('profile');
    } catch (error) {
      console.error('Failed to create user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userId = currentUser?.user.id || 1; // Default user ID

      if (userType === 'brand') {
        const brandData: CreateBrandProfileInput = {
          ...brandForm,
          user_id: userId,
          description: brandForm.description || null,
          website: brandForm.website || null,
          industry: brandForm.industry || null,
          logo_url: brandForm.logo_url || null
        };
        await trpc.createBrandProfile.mutate(brandData);
      } else {
        const influencerData: CreateInfluencerProfileInput = {
          ...influencerForm,
          user_id: userId,
          bio: influencerForm.bio || null,
          avatar_url: influencerForm.avatar_url || null,
          instagram_handle: influencerForm.instagram_handle || null,
          tiktok_handle: influencerForm.tiktok_handle || null,
          youtube_handle: influencerForm.youtube_handle || null,
          follower_count: influencerForm.follower_count,
          engagement_rate: influencerForm.engagement_rate,
          category: influencerForm.category || null
        };
        await trpc.createInfluencerProfile.mutate(influencerData);
      }

      onComplete();
    } catch (error) {
      console.error('Failed to create profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'user' && !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-full p-3 w-16 h-16 mx-auto mb-4">
              <UserPlus className="h-10 w-10 text-white" />
            </div>
            <CardTitle className="text-2xl">Welcome to InfluenceConnect</CardTitle>
            <p className="text-gray-600 mt-2">Create your account to get started</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUserSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={userForm.email}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setUserForm(prev => ({ ...prev, email: e.target.value }))
                  }
                  placeholder="your@email.com"
                  required
                />
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={userForm.password}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setUserForm(prev => ({ ...prev, password: e.target.value }))
                  }
                  placeholder="Choose a secure password"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <Label>I am a...</Label>
                <RadioGroup 
                  value={userType} 
                  onValueChange={handleUserTypeChange}
                  className="mt-2"
                >
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="brand" id="brand" />
                    <Label htmlFor="brand" className="flex-1 flex items-center space-x-2 cursor-pointer">
                      <Building className="h-4 w-4 text-blue-600" />
                      <div>
                        <div className="font-medium">Brand</div>
                        <div className="text-sm text-gray-500">Looking to collaborate with influencers</div>
                      </div>
                    </Label>
                  </div>
                  
                  <div className="flex items-center space-x-2 p-3 border rounded-lg hover:bg-gray-50">
                    <RadioGroupItem value="influencer" id="influencer" />
                    <Label htmlFor="influencer" className="flex-1 flex items-center space-x-2 cursor-pointer">
                      <Star className="h-4 w-4 text-purple-600" />
                      <div>
                        <div className="font-medium">Influencer</div>
                        <div className="text-sm text-gray-500">Content creator ready to collaborate</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Profile setup step
  const currentUserType = currentUser?.user.user_type || userType;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          <div className={`rounded-full p-3 w-16 h-16 mx-auto mb-4 ${
            currentUserType === 'brand' 
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600' 
              : 'bg-gradient-to-r from-purple-600 to-pink-600'
          }`}>
            {currentUserType === 'brand' ? (
              <Building className="h-10 w-10 text-white" />
            ) : (
              <Star className="h-10 w-10 text-white" />
            )}
          </div>
          <CardTitle className="text-2xl">
            Complete Your {currentUserType === 'brand' ? 'Brand' : 'Influencer'} Profile
          </CardTitle>
          <p className="text-gray-600 mt-2">
            {currentUserType === 'brand' 
              ? 'Tell influencers about your brand and collaboration opportunities'
              : 'Showcase your content and reach to attract brand partnerships'
            }
          </p>
        </CardHeader>
        <CardContent>
          {currentUserType === 'brand' ? (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">Company Name *</Label>
                  <Input
                    id="company_name"
                    value={brandForm.company_name}
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
                  placeholder="Tell influencers about your brand, values, and what you're looking for in collaborations"
                  rows={4}
                />
              </div>

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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating Profile...' : 'Complete Profile'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="display_name">Display Name *</Label>
                  <Input
                    id="display_name"
                    value={influencerForm.display_name}
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="instagram_handle">Instagram</Label>
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
                  <Label htmlFor="tiktok_handle">TikTok</Label>
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
                  <Label htmlFor="youtube_handle">YouTube</Label>
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

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating Profile...' : 'Complete Profile'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}