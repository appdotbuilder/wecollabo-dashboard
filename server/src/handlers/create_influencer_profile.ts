import { db } from '../db';
import { influencerProfilesTable, usersTable } from '../db/schema';
import { type CreateInfluencerProfileInput, type InfluencerProfile } from '../schema';
import { eq } from 'drizzle-orm';

export const createInfluencerProfile = async (input: CreateInfluencerProfileInput): Promise<InfluencerProfile> => {
  try {
    // Validate that the user exists and is of type 'influencer'
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .limit(1)
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    if (user[0].user_type !== 'influencer') {
      throw new Error(`User with id ${input.user_id} is not an influencer`);
    }

    // Check if influencer profile already exists
    const existingProfile = await db.select()
      .from(influencerProfilesTable)
      .where(eq(influencerProfilesTable.user_id, input.user_id))
      .limit(1)
      .execute();

    if (existingProfile.length > 0) {
      throw new Error(`Influencer profile already exists for user ${input.user_id}`);
    }

    // Insert influencer profile record
    const result = await db.insert(influencerProfilesTable)
      .values({
        user_id: input.user_id,
        display_name: input.display_name,
        bio: input.bio || null,
        profile_image: input.profile_image || null,
        total_reach: input.total_reach,
        engagement_rate: input.engagement_rate.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const profile = result[0];
    return {
      ...profile,
      engagement_rate: parseFloat(profile.engagement_rate), // Convert string back to number
      rating: parseFloat(profile.rating),
      total_earnings: parseFloat(profile.total_earnings)
    };
  } catch (error) {
    console.error('Influencer profile creation failed:', error);
    throw error;
  }
};