import { db } from '../db';
import { influencerProfilesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type InfluencerProfile } from '../schema';

export async function getInfluencerProfile(userId: number): Promise<InfluencerProfile | null> {
  try {
    const results = await db.select()
      .from(influencerProfilesTable)
      .where(eq(influencerProfilesTable.user_id, userId))
      .execute();

    if (results.length === 0) {
      return null;
    }

    const profile = results[0];

    // Convert numeric fields back to numbers
    return {
      ...profile,
      engagement_rate: parseFloat(profile.engagement_rate),
      rating: parseFloat(profile.rating),
      total_earnings: parseFloat(profile.total_earnings)
    };
  } catch (error) {
    console.error('Failed to fetch influencer profile:', error);
    throw error;
  }
}