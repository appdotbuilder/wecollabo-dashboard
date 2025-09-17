import { db } from '../db';
import { reviewsTable, usersTable } from '../db/schema';
import { type Review } from '../schema';
import { eq } from 'drizzle-orm';

export const getUserReviews = async (userId: number): Promise<Review[]> => {
  try {
    // Query reviews where the user is the reviewee (recipient of the review)
    const results = await db.select()
      .from(reviewsTable)
      .innerJoin(usersTable, eq(reviewsTable.reviewer_id, usersTable.id))
      .where(eq(reviewsTable.reviewee_id, userId))
      .execute();

    // Map results and handle numeric conversions
    return results.map(result => ({
      id: result.reviews.id,
      collaboration_id: result.reviews.collaboration_id,
      reviewer_id: result.reviews.reviewer_id,
      reviewee_id: result.reviews.reviewee_id,
      rating: result.reviews.rating,
      comment: result.reviews.comment,
      created_at: result.reviews.created_at,
      updated_at: result.reviews.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch user reviews:', error);
    throw error;
  }
};