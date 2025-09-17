import { z } from 'zod';

// User type enum
export const userTypeEnum = z.enum(['brand', 'influencer']);
export type UserType = z.infer<typeof userTypeEnum>;

// Base user schema
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password: z.string(),
  user_type: userTypeEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Brand profile schema
export const brandProfileSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  company_name: z.string(),
  description: z.string().nullable(),
  website: z.string().nullable(),
  industry: z.string().nullable(),
  logo_url: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type BrandProfile = z.infer<typeof brandProfileSchema>;

// Influencer profile schema
export const influencerProfileSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  display_name: z.string(),
  bio: z.string().nullable(),
  avatar_url: z.string().nullable(),
  instagram_handle: z.string().nullable(),
  tiktok_handle: z.string().nullable(),
  youtube_handle: z.string().nullable(),
  follower_count: z.number().nullable(),
  engagement_rate: z.number().nullable(),
  category: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type InfluencerProfile = z.infer<typeof influencerProfileSchema>;

// Direct message schema
export const directMessageSchema = z.object({
  id: z.number(),
  sender_id: z.number(),
  recipient_id: z.number(),
  content: z.string(),
  is_read: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type DirectMessage = z.infer<typeof directMessageSchema>;

// Review schema
export const reviewSchema = z.object({
  id: z.number(),
  brand_user_id: z.number(),
  influencer_user_id: z.number(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Review = z.infer<typeof reviewSchema>;

// Input schemas for creating entities
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  user_type: userTypeEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createBrandProfileInputSchema = z.object({
  user_id: z.number(),
  company_name: z.string(),
  description: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional()
});

export type CreateBrandProfileInput = z.infer<typeof createBrandProfileInputSchema>;

export const createInfluencerProfileInputSchema = z.object({
  user_id: z.number(),
  display_name: z.string(),
  bio: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  instagram_handle: z.string().nullable().optional(),
  tiktok_handle: z.string().nullable().optional(),
  youtube_handle: z.string().nullable().optional(),
  follower_count: z.number().nullable().optional(),
  engagement_rate: z.number().nullable().optional(),
  category: z.string().nullable().optional()
});

export type CreateInfluencerProfileInput = z.infer<typeof createInfluencerProfileInputSchema>;

export const createDirectMessageInputSchema = z.object({
  sender_id: z.number(),
  recipient_id: z.number(),
  content: z.string()
});

export type CreateDirectMessageInput = z.infer<typeof createDirectMessageInputSchema>;

export const createReviewInputSchema = z.object({
  brand_user_id: z.number(),
  influencer_user_id: z.number(),
  rating: z.number().int().min(1).max(5),
  feedback: z.string()
});

export type CreateReviewInput = z.infer<typeof createReviewInputSchema>;

// Update schemas
export const updateBrandProfileInputSchema = z.object({
  user_id: z.number(),
  company_name: z.string().optional(),
  description: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  logo_url: z.string().nullable().optional()
});

export type UpdateBrandProfileInput = z.infer<typeof updateBrandProfileInputSchema>;

export const updateInfluencerProfileInputSchema = z.object({
  user_id: z.number(),
  display_name: z.string().optional(),
  bio: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  instagram_handle: z.string().nullable().optional(),
  tiktok_handle: z.string().nullable().optional(),
  youtube_handle: z.string().nullable().optional(),
  follower_count: z.number().nullable().optional(),
  engagement_rate: z.number().nullable().optional(),
  category: z.string().nullable().optional()
});

export type UpdateInfluencerProfileInput = z.infer<typeof updateInfluencerProfileInputSchema>;

export const markMessageAsReadInputSchema = z.object({
  message_id: z.number(),
  user_id: z.number()
});

export type MarkMessageAsReadInput = z.infer<typeof markMessageAsReadInputSchema>;

// Query schemas
export const getMessagesInputSchema = z.object({
  user_id: z.number(),
  other_user_id: z.number().optional()
});

export type GetMessagesInput = z.infer<typeof getMessagesInputSchema>;

export const getInfluencerReviewsInputSchema = z.object({
  influencer_user_id: z.number()
});

export type GetInfluencerReviewsInput = z.infer<typeof getInfluencerReviewsInputSchema>;

export const getUserProfileInputSchema = z.object({
  user_id: z.number()
});

export type GetUserProfileInput = z.infer<typeof getUserProfileInputSchema>;