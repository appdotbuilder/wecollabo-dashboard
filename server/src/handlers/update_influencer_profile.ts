import { db } from '../db';
import { influencerProfilesTable, usersTable } from '../db/schema';
import { type UpdateInfluencerProfileInput, type InfluencerProfile } from '../schema';
import { eq } from 'drizzle-orm';

export const updateInfluencerProfile = async (input: UpdateInfluencerProfileInput): Promise<InfluencerProfile> => {
  try {
    // First verify that the user exists
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error('User not found');
    }

    // Check if the influencer profile exists
    const existingProfile = await db.select()
      .from(influencerProfilesTable)
      .where(eq(influencerProfilesTable.user_id, input.user_id))
      .execute();

    if (existingProfile.length === 0) {
      throw new Error('Influencer profile not found');
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.display_name !== undefined) {
      updateData.display_name = input.display_name;
    }
    if (input.bio !== undefined) {
      updateData.bio = input.bio;
    }
    if (input.avatar_url !== undefined) {
      updateData.avatar_url = input.avatar_url;
    }
    if (input.instagram_handle !== undefined) {
      updateData.instagram_handle = input.instagram_handle;
    }
    if (input.tiktok_handle !== undefined) {
      updateData.tiktok_handle = input.tiktok_handle;
    }
    if (input.youtube_handle !== undefined) {
      updateData.youtube_handle = input.youtube_handle;
    }
    if (input.follower_count !== undefined) {
      updateData.follower_count = input.follower_count;
    }
    if (input.engagement_rate !== undefined) {
      updateData.engagement_rate = input.engagement_rate === null ? null : input.engagement_rate.toString(); // Convert number to string for numeric column
    }
    if (input.category !== undefined) {
      updateData.category = input.category;
    }

    // Update the profile
    const result = await db.update(influencerProfilesTable)
      .set(updateData)
      .where(eq(influencerProfilesTable.user_id, input.user_id))
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const profile = result[0];
    return {
      ...profile,
      engagement_rate: profile.engagement_rate ? parseFloat(profile.engagement_rate) : null
    };
  } catch (error) {
    console.error('Influencer profile update failed:', error);
    throw error;
  }
};