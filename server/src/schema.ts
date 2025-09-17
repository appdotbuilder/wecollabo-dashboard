import { z } from 'zod';

// Enums
export const userTypeEnum = z.enum(['influencer', 'brand']);
export const campaignStatusEnum = z.enum(['draft', 'active', 'paused', 'completed', 'cancelled']);
export const collaborationStatusEnum = z.enum(['pending', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled']);
export const deliverableStatusEnum = z.enum(['pending', 'submitted', 'approved', 'revision_requested', 'rejected']);
export const paymentStatusEnum = z.enum(['pending', 'in_escrow', 'released', 'refunded']);
export const messageTypeEnum = z.enum(['text', 'file', 'system']);
export const disputeStatusEnum = z.enum(['open', 'in_review', 'resolved', 'closed']);
export const teamRoleEnum = z.enum(['admin', 'manager', 'member']);

// User schemas
export const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  password_hash: z.string(),
  user_type: userTypeEnum,
  is_verified: z.boolean(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type User = z.infer<typeof userSchema>;

// Influencer profile schema
export const influencerProfileSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  display_name: z.string(),
  bio: z.string().nullable(),
  profile_image: z.string().nullable(),
  total_reach: z.number(),
  engagement_rate: z.number(),
  total_collaborations: z.number(),
  rating: z.number(),
  total_earnings: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type InfluencerProfile = z.infer<typeof influencerProfileSchema>;

// Brand profile schema
export const brandProfileSchema = z.object({
  id: z.number(),
  user_id: z.number(),
  company_name: z.string(),
  company_description: z.string().nullable(),
  logo: z.string().nullable(),
  website: z.string().nullable(),
  industry: z.string().nullable(),
  total_campaigns: z.number(),
  rating: z.number(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type BrandProfile = z.infer<typeof brandProfileSchema>;

// Campaign schema
export const campaignSchema = z.object({
  id: z.number(),
  brand_id: z.number(),
  title: z.string(),
  description: z.string(),
  budget: z.number(),
  deliverable_requirements: z.string(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date(),
  status: campaignStatusEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Campaign = z.infer<typeof campaignSchema>;

// Collaboration schema
export const collaborationSchema = z.object({
  id: z.number(),
  campaign_id: z.number(),
  influencer_id: z.number(),
  agreed_price: z.number(),
  status: collaborationStatusEnum,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Collaboration = z.infer<typeof collaborationSchema>;

// Deliverable schema
export const deliverableSchema = z.object({
  id: z.number(),
  collaboration_id: z.number(),
  title: z.string(),
  description: z.string().nullable(),
  file_url: z.string().nullable(),
  status: deliverableStatusEnum,
  feedback: z.string().nullable(),
  submitted_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Deliverable = z.infer<typeof deliverableSchema>;

// Payment schema
export const paymentSchema = z.object({
  id: z.number(),
  collaboration_id: z.number(),
  amount: z.number(),
  platform_commission: z.number(),
  influencer_payout: z.number(),
  status: paymentStatusEnum,
  transaction_id: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Payment = z.infer<typeof paymentSchema>;

// Team member schema
export const teamMemberSchema = z.object({
  id: z.number(),
  brand_id: z.number(),
  user_id: z.number(),
  role: teamRoleEnum,
  invited_at: z.coerce.date(),
  joined_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type TeamMember = z.infer<typeof teamMemberSchema>;

// Message schema
export const messageSchema = z.object({
  id: z.number(),
  collaboration_id: z.number(),
  sender_id: z.number(),
  content: z.string(),
  message_type: messageTypeEnum,
  file_url: z.string().nullable(),
  sent_at: z.coerce.date(),
  read_at: z.coerce.date().nullable(),
  created_at: z.coerce.date()
});

export type Message = z.infer<typeof messageSchema>;

// Review schema
export const reviewSchema = z.object({
  id: z.number(),
  collaboration_id: z.number(),
  reviewer_id: z.number(),
  reviewee_id: z.number(),
  rating: z.number().min(1).max(5),
  comment: z.string().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Review = z.infer<typeof reviewSchema>;

// Dispute schema
export const disputeSchema = z.object({
  id: z.number(),
  collaboration_id: z.number(),
  initiated_by: z.number(),
  subject: z.string(),
  description: z.string(),
  status: disputeStatusEnum,
  resolution: z.string().nullable(),
  resolved_at: z.coerce.date().nullable(),
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Dispute = z.infer<typeof disputeSchema>;

// Input schemas for creating records
export const createUserInputSchema = z.object({
  email: z.string().email(),
  password_hash: z.string(),
  user_type: userTypeEnum
});

export type CreateUserInput = z.infer<typeof createUserInputSchema>;

export const createInfluencerProfileInputSchema = z.object({
  user_id: z.number(),
  display_name: z.string(),
  bio: z.string().nullable().optional(),
  profile_image: z.string().nullable().optional(),
  total_reach: z.number().nonnegative(),
  engagement_rate: z.number().min(0).max(100)
});

export type CreateInfluencerProfileInput = z.infer<typeof createInfluencerProfileInputSchema>;

export const createBrandProfileInputSchema = z.object({
  user_id: z.number(),
  company_name: z.string(),
  company_description: z.string().nullable().optional(),
  logo: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  industry: z.string().nullable().optional()
});

export type CreateBrandProfileInput = z.infer<typeof createBrandProfileInputSchema>;

export const createCampaignInputSchema = z.object({
  brand_id: z.number(),
  title: z.string(),
  description: z.string(),
  budget: z.number().positive(),
  deliverable_requirements: z.string(),
  start_date: z.coerce.date(),
  end_date: z.coerce.date()
});

export type CreateCampaignInput = z.infer<typeof createCampaignInputSchema>;

export const createCollaborationInputSchema = z.object({
  campaign_id: z.number(),
  influencer_id: z.number(),
  agreed_price: z.number().positive()
});

export type CreateCollaborationInput = z.infer<typeof createCollaborationInputSchema>;

export const createDeliverableInputSchema = z.object({
  collaboration_id: z.number(),
  title: z.string(),
  description: z.string().nullable().optional(),
  file_url: z.string().nullable().optional()
});

export type CreateDeliverableInput = z.infer<typeof createDeliverableInputSchema>;

export const createPaymentInputSchema = z.object({
  collaboration_id: z.number(),
  amount: z.number().positive(),
  platform_commission: z.number().nonnegative(),
  influencer_payout: z.number().positive()
});

export type CreatePaymentInput = z.infer<typeof createPaymentInputSchema>;

export const createTeamMemberInputSchema = z.object({
  brand_id: z.number(),
  user_id: z.number(),
  role: teamRoleEnum
});

export type CreateTeamMemberInput = z.infer<typeof createTeamMemberInputSchema>;

export const createMessageInputSchema = z.object({
  collaboration_id: z.number(),
  sender_id: z.number(),
  content: z.string(),
  message_type: messageTypeEnum,
  file_url: z.string().nullable().optional()
});

export type CreateMessageInput = z.infer<typeof createMessageInputSchema>;

export const createReviewInputSchema = z.object({
  collaboration_id: z.number(),
  reviewer_id: z.number(),
  reviewee_id: z.number(),
  rating: z.number().min(1).max(5),
  comment: z.string().nullable().optional()
});

export type CreateReviewInput = z.infer<typeof createReviewInputSchema>;

export const createDisputeInputSchema = z.object({
  collaboration_id: z.number(),
  initiated_by: z.number(),
  subject: z.string(),
  description: z.string()
});

export type CreateDisputeInput = z.infer<typeof createDisputeInputSchema>;

// Update schemas
export const updateCollaborationStatusInputSchema = z.object({
  id: z.number(),
  status: collaborationStatusEnum
});

export type UpdateCollaborationStatusInput = z.infer<typeof updateCollaborationStatusInputSchema>;

export const updateDeliverableStatusInputSchema = z.object({
  id: z.number(),
  status: deliverableStatusEnum,
  feedback: z.string().nullable().optional()
});

export type UpdateDeliverableStatusInput = z.infer<typeof updateDeliverableStatusInputSchema>;

export const updatePaymentStatusInputSchema = z.object({
  id: z.number(),
  status: paymentStatusEnum,
  transaction_id: z.string().nullable().optional()
});

export type UpdatePaymentStatusInput = z.infer<typeof updatePaymentStatusInputSchema>;