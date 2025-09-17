import { db } from '../db';
import { usersTable, brandProfilesTable, influencerProfilesTable } from '../db/schema';
import { type GetUserProfileInput, type User, type BrandProfile, type InfluencerProfile } from '../schema';
import { eq } from 'drizzle-orm';

export interface UserProfileResponse {
  user: User;
  brandProfile?: BrandProfile;
  influencerProfile?: InfluencerProfile;
}

export const getUserProfile = async (input: GetUserProfileInput): Promise<UserProfileResponse> => {
  try {
    // First, fetch the user
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (users.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    const user = users[0];
    const response: UserProfileResponse = { user };

    // Fetch associated profile based on user_type
    if (user.user_type === 'brand') {
      const brandProfiles = await db.select()
        .from(brandProfilesTable)
        .where(eq(brandProfilesTable.user_id, user.id))
        .execute();

      if (brandProfiles.length > 0) {
        response.brandProfile = brandProfiles[0];
      }
    } else if (user.user_type === 'influencer') {
      const influencerProfiles = await db.select()
        .from(influencerProfilesTable)
        .where(eq(influencerProfilesTable.user_id, user.id))
        .execute();

      if (influencerProfiles.length > 0) {
        const profile = influencerProfiles[0];
        // Convert numeric field back to number
        response.influencerProfile = {
          ...profile,
          engagement_rate: profile.engagement_rate ? parseFloat(profile.engagement_rate) : null
        };
      }
    }

    return response;
  } catch (error) {
    console.error('Get user profile failed:', error);
    throw error;
  }
};