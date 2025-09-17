import { db } from '../db';
import { brandProfilesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type BrandProfile } from '../schema';

export const getBrandProfile = async (userId: number): Promise<BrandProfile | null> => {
  try {
    // Query brand profile by user_id
    const results = await db.select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.user_id, userId))
      .execute();

    if (results.length === 0) {
      return null;
    }

    // Convert numeric fields back to numbers before returning
    const profile = results[0];
    return {
      ...profile,
      rating: parseFloat(profile.rating)
    };
  } catch (error) {
    console.error('Brand profile fetch failed:', error);
    throw error;
  }
};