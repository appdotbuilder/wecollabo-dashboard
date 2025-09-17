import { db } from '../db';
import { reviewsTable, collaborationsTable, influencerProfilesTable, brandProfilesTable, campaignsTable } from '../db/schema';
import { type CreateReviewInput, type Review } from '../schema';
import { eq, and, or } from 'drizzle-orm';

export const createReview = async (input: CreateReviewInput): Promise<Review> => {
  try {
    // First, validate that the collaboration exists and is completed
    const collaboration = await db.select()
      .from(collaborationsTable)
      .innerJoin(influencerProfilesTable, eq(collaborationsTable.influencer_id, influencerProfilesTable.id))
      .innerJoin(campaignsTable, eq(collaborationsTable.campaign_id, campaignsTable.id))
      .innerJoin(brandProfilesTable, eq(campaignsTable.brand_id, brandProfilesTable.id))
      .where(eq(collaborationsTable.id, input.collaboration_id))
      .execute();

    if (collaboration.length === 0) {
      throw new Error('Collaboration not found');
    }

    const collaborationData = collaboration[0];
    
    if (collaborationData.collaborations.status !== 'completed') {
      throw new Error('Reviews can only be created for completed collaborations');
    }

    // Validate that the reviewer is authorized (either the influencer or someone from the brand)
    const influencerUserId = collaborationData.influencer_profiles.user_id;
    const brandUserId = collaborationData.brand_profiles.user_id;
    
    const isAuthorizedReviewer = input.reviewer_id === influencerUserId || input.reviewer_id === brandUserId;
    
    if (!isAuthorizedReviewer) {
      throw new Error('Only collaboration participants can create reviews');
    }

    // Validate reviewee is the other party in the collaboration
    const validReviewee = (input.reviewer_id === influencerUserId && input.reviewee_id === brandUserId) ||
                         (input.reviewer_id === brandUserId && input.reviewee_id === influencerUserId);
    
    if (!validReviewee) {
      throw new Error('Invalid reviewee - must be the other party in the collaboration');
    }

    // Check if a review already exists from this reviewer for this collaboration
    const existingReview = await db.select()
      .from(reviewsTable)
      .where(and(
        eq(reviewsTable.collaboration_id, input.collaboration_id),
        eq(reviewsTable.reviewer_id, input.reviewer_id)
      ))
      .execute();

    if (existingReview.length > 0) {
      throw new Error('Review already exists for this collaboration from this reviewer');
    }

    // Insert the review record
    const result = await db.insert(reviewsTable)
      .values({
        collaboration_id: input.collaboration_id,
        reviewer_id: input.reviewer_id,
        reviewee_id: input.reviewee_id,
        rating: input.rating,
        comment: input.comment || null
      })
      .returning()
      .execute();

    const review = result[0];
    
    return {
      ...review,
      // No numeric conversions needed - rating is integer, no decimal fields
    };
  } catch (error) {
    console.error('Review creation failed:', error);
    throw error;
  }
};