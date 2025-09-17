import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, influencerProfilesTable } from '../db/schema';
import { type UpdateInfluencerProfileInput } from '../schema';
import { updateInfluencerProfile } from '../handlers/update_influencer_profile';
import { eq } from 'drizzle-orm';

describe('updateInfluencerProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test user and profile
  const createTestUserAndProfile = async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password: 'password123',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    // Create initial influencer profile
    const profileResult = await db.insert(influencerProfilesTable)
      .values({
        user_id: userId,
        display_name: 'Original Name',
        bio: 'Original bio',
        avatar_url: 'https://example.com/avatar.jpg',
        instagram_handle: '@original_insta',
        tiktok_handle: '@original_tiktok',
        youtube_handle: '@original_youtube',
        follower_count: 1000,
        engagement_rate: '5.25',
        category: 'fitness'
      })
      .returning()
      .execute();

    return { userId, profile: profileResult[0] };
  };

  it('should update influencer profile with all fields', async () => {
    const { userId } = await createTestUserAndProfile();

    const updateInput: UpdateInfluencerProfileInput = {
      user_id: userId,
      display_name: 'Updated Name',
      bio: 'Updated bio content',
      avatar_url: 'https://example.com/new-avatar.jpg',
      instagram_handle: '@updated_insta',
      tiktok_handle: '@updated_tiktok',
      youtube_handle: '@updated_youtube',
      follower_count: 2000,
      engagement_rate: 7.85,
      category: 'lifestyle'
    };

    const result = await updateInfluencerProfile(updateInput);

    // Verify all fields were updated
    expect(result.display_name).toEqual('Updated Name');
    expect(result.bio).toEqual('Updated bio content');
    expect(result.avatar_url).toEqual('https://example.com/new-avatar.jpg');
    expect(result.instagram_handle).toEqual('@updated_insta');
    expect(result.tiktok_handle).toEqual('@updated_tiktok');
    expect(result.youtube_handle).toEqual('@updated_youtube');
    expect(result.follower_count).toEqual(2000);
    expect(result.engagement_rate).toEqual(7.85);
    expect(typeof result.engagement_rate).toBe('number');
    expect(result.category).toEqual('lifestyle');
    expect(result.user_id).toEqual(userId);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update only specified fields', async () => {
    const { userId } = await createTestUserAndProfile();

    const updateInput: UpdateInfluencerProfileInput = {
      user_id: userId,
      display_name: 'Partially Updated Name',
      engagement_rate: 6.50
    };

    const result = await updateInfluencerProfile(updateInput);

    // Verify only specified fields were updated
    expect(result.display_name).toEqual('Partially Updated Name');
    expect(result.engagement_rate).toEqual(6.50);
    
    // Verify other fields remained unchanged
    expect(result.bio).toEqual('Original bio');
    expect(result.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result.instagram_handle).toEqual('@original_insta');
    expect(result.tiktok_handle).toEqual('@original_tiktok');
    expect(result.youtube_handle).toEqual('@original_youtube');
    expect(result.follower_count).toEqual(1000);
    expect(result.category).toEqual('fitness');
  });

  it('should handle null values correctly', async () => {
    const { userId } = await createTestUserAndProfile();

    const updateInput: UpdateInfluencerProfileInput = {
      user_id: userId,
      bio: null,
      avatar_url: null,
      instagram_handle: null,
      tiktok_handle: null,
      youtube_handle: null,
      follower_count: null,
      engagement_rate: null,
      category: null
    };

    const result = await updateInfluencerProfile(updateInput);

    // Verify null fields
    expect(result.bio).toBeNull();
    expect(result.avatar_url).toBeNull();
    expect(result.instagram_handle).toBeNull();
    expect(result.tiktok_handle).toBeNull();
    expect(result.youtube_handle).toBeNull();
    expect(result.follower_count).toBeNull();
    expect(result.engagement_rate).toBeNull();
    expect(result.category).toBeNull();

    // Verify display_name was not changed (not provided in update)
    expect(result.display_name).toEqual('Original Name');
  });

  it('should persist changes to database', async () => {
    const { userId } = await createTestUserAndProfile();

    const updateInput: UpdateInfluencerProfileInput = {
      user_id: userId,
      display_name: 'Database Test Name',
      follower_count: 5000,
      engagement_rate: 8.25
    };

    await updateInfluencerProfile(updateInput);

    // Query database directly to verify persistence
    const profiles = await db.select()
      .from(influencerProfilesTable)
      .where(eq(influencerProfilesTable.user_id, userId))
      .execute();

    expect(profiles).toHaveLength(1);
    const profile = profiles[0];
    expect(profile.display_name).toEqual('Database Test Name');
    expect(profile.follower_count).toEqual(5000);
    expect(parseFloat(profile.engagement_rate!)).toEqual(8.25);
    expect(profile.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const updateInput: UpdateInfluencerProfileInput = {
      user_id: 99999,
      display_name: 'Non-existent User'
    };

    await expect(updateInfluencerProfile(updateInput))
      .rejects.toThrow(/user not found/i);
  });

  it('should throw error when influencer profile does not exist', async () => {
    // Create user without profile
    const userResult = await db.insert(usersTable)
      .values({
        email: 'noprofile@example.com',
        password: 'password123',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;

    const updateInput: UpdateInfluencerProfileInput = {
      user_id: userId,
      display_name: 'Profile Does Not Exist'
    };

    await expect(updateInfluencerProfile(updateInput))
      .rejects.toThrow(/influencer profile not found/i);
  });

  it('should update timestamps correctly', async () => {
    const { userId, profile } = await createTestUserAndProfile();
    
    // Wait a bit to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));

    const updateInput: UpdateInfluencerProfileInput = {
      user_id: userId,
      display_name: 'Timestamp Test'
    };

    const result = await updateInfluencerProfile(updateInput);

    // Verify updated_at was changed
    expect(result.updated_at.getTime()).toBeGreaterThan(profile.updated_at.getTime());
    expect(result.created_at).toEqual(profile.created_at);
  });
});