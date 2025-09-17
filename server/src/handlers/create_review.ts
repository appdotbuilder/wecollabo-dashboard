import { db } from '../db';
import { reviewsTable, usersTable } from '../db/schema';
import { type CreateReviewInput, type Review } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createReview = async (input: CreateReviewInput): Promise<Review> => {
  try {
    // Validate that brand_user_id exists and is of type 'brand'
    const brandUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.brand_user_id))
      .execute();

    if (brandUser.length === 0) {
      throw new Error('Brand user not found');
    }

    if (brandUser[0].user_type !== 'brand') {
      throw new Error('User is not a brand');
    }

    // Validate that influencer_user_id exists and is of type 'influencer'
    const influencerUser = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.influencer_user_id))
      .execute();

    if (influencerUser.length === 0) {
      throw new Error('Influencer user not found');
    }

    if (influencerUser[0].user_type !== 'influencer') {
      throw new Error('User is not an influencer');
    }

    // Check for duplicate reviews from the same brand to the same influencer
    const existingReview = await db.select()
      .from(reviewsTable)
      .where(and(
        eq(reviewsTable.brand_user_id, input.brand_user_id),
        eq(reviewsTable.influencer_user_id, input.influencer_user_id)
      ))
      .execute();

    if (existingReview.length > 0) {
      throw new Error('Review already exists from this brand to this influencer');
    }

    // Create the review
    const result = await db.insert(reviewsTable)
      .values({
        brand_user_id: input.brand_user_id,
        influencer_user_id: input.influencer_user_id,
        rating: input.rating,
        feedback: input.feedback
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Review creation failed:', error);
    throw error;
  }
};