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
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    if (user[0].user_type !== 'influencer') {
      throw new Error('User must be of type "influencer" to create an influencer profile');
    }

    // Insert influencer profile record
    const result = await db.insert(influencerProfilesTable)
      .values({
        user_id: input.user_id,
        display_name: input.display_name,
        bio: input.bio || null,
        avatar_url: input.avatar_url || null,
        instagram_handle: input.instagram_handle || null,
        tiktok_handle: input.tiktok_handle || null,
        youtube_handle: input.youtube_handle || null,
        follower_count: input.follower_count || null,
        engagement_rate: input.engagement_rate ? input.engagement_rate.toString() : null, // Convert number to string for numeric column
        category: input.category || null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const profile = result[0];
    return {
      ...profile,
      engagement_rate: profile.engagement_rate ? parseFloat(profile.engagement_rate) : null // Convert string back to number
    };
  } catch (error) {
    console.error('Influencer profile creation failed:', error);
    throw error;
  }
};