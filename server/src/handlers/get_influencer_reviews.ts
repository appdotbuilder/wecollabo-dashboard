import { db } from '../db';
import { reviewsTable, brandProfilesTable, usersTable } from '../db/schema';
import { type GetInfluencerReviewsInput, type Review } from '../schema';
import { eq, desc } from 'drizzle-orm';

export interface ReviewWithBrandInfo extends Review {
  brand_company_name: string;
  brand_logo_url: string | null;
}

export const getInfluencerReviews = async (input: GetInfluencerReviewsInput): Promise<ReviewWithBrandInfo[]> => {
  try {
    // Query reviews for the influencer with brand information
    const results = await db.select({
      review: reviewsTable,
      brandProfile: brandProfilesTable
    })
      .from(reviewsTable)
      .innerJoin(usersTable, eq(reviewsTable.brand_user_id, usersTable.id))
      .innerJoin(brandProfilesTable, eq(usersTable.id, brandProfilesTable.user_id))
      .where(eq(reviewsTable.influencer_user_id, input.influencer_user_id))
      .orderBy(desc(reviewsTable.created_at))
      .execute();

    // Transform the joined results to the expected format
    return results.map(result => ({
      id: result.review.id,
      brand_user_id: result.review.brand_user_id,
      influencer_user_id: result.review.influencer_user_id,
      rating: result.review.rating,
      feedback: result.review.feedback,
      created_at: result.review.created_at,
      updated_at: result.review.updated_at,
      brand_company_name: result.brandProfile.company_name,
      brand_logo_url: result.brandProfile.logo_url
    }));
  } catch (error) {
    console.error('Failed to fetch influencer reviews:', error);
    throw error;
  }
};