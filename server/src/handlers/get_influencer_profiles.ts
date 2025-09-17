import { db } from '../db';
import { influencerProfilesTable } from '../db/schema';
import { type InfluencerProfile } from '../schema';

export const getInfluencerProfiles = async (): Promise<InfluencerProfile[]> => {
  try {
    // Fetch all influencer profiles from the database
    const results = await db.select()
      .from(influencerProfilesTable)
      .execute();

    // Convert numeric fields back to numbers and return
    return results.map(profile => ({
      ...profile,
      engagement_rate: profile.engagement_rate ? parseFloat(profile.engagement_rate) : null
    }));
  } catch (error) {
    console.error('Failed to fetch influencer profiles:', error);
    throw error;
  }
};