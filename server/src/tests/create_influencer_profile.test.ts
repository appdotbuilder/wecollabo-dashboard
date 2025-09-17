import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, influencerProfilesTable } from '../db/schema';
import { type CreateInfluencerProfileInput } from '../schema';
import { createInfluencerProfile } from '../handlers/create_influencer_profile';
import { eq } from 'drizzle-orm';

describe('createInfluencerProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper to create a test user
  const createTestUser = async (userType: 'brand' | 'influencer' = 'influencer') => {
    const result = await db.insert(usersTable)
      .values({
        email: `test-${Date.now()}@example.com`,
        password: 'password123',
        user_type: userType
      })
      .returning()
      .execute();
    return result[0];
  };

  it('should create an influencer profile with all fields', async () => {
    const user = await createTestUser('influencer');
    
    const testInput: CreateInfluencerProfileInput = {
      user_id: user.id,
      display_name: 'Test Influencer',
      bio: 'A test influencer bio',
      avatar_url: 'https://example.com/avatar.jpg',
      instagram_handle: '@testinfluencer',
      tiktok_handle: '@testtiktok',
      youtube_handle: '@testyoutube',
      follower_count: 10000,
      engagement_rate: 3.75,
      category: 'lifestyle'
    };

    const result = await createInfluencerProfile(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(user.id);
    expect(result.display_name).toEqual('Test Influencer');
    expect(result.bio).toEqual('A test influencer bio');
    expect(result.avatar_url).toEqual('https://example.com/avatar.jpg');
    expect(result.instagram_handle).toEqual('@testinfluencer');
    expect(result.tiktok_handle).toEqual('@testtiktok');
    expect(result.youtube_handle).toEqual('@testyoutube');
    expect(result.follower_count).toEqual(10000);
    expect(result.engagement_rate).toEqual(3.75);
    expect(typeof result.engagement_rate).toBe('number');
    expect(result.category).toEqual('lifestyle');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create an influencer profile with minimal fields', async () => {
    const user = await createTestUser('influencer');
    
    const testInput: CreateInfluencerProfileInput = {
      user_id: user.id,
      display_name: 'Minimal Influencer'
    };

    const result = await createInfluencerProfile(testInput);

    // Basic field validation
    expect(result.user_id).toEqual(user.id);
    expect(result.display_name).toEqual('Minimal Influencer');
    expect(result.bio).toBeNull();
    expect(result.avatar_url).toBeNull();
    expect(result.instagram_handle).toBeNull();
    expect(result.tiktok_handle).toBeNull();
    expect(result.youtube_handle).toBeNull();
    expect(result.follower_count).toBeNull();
    expect(result.engagement_rate).toBeNull();
    expect(result.category).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save profile to database', async () => {
    const user = await createTestUser('influencer');
    
    const testInput: CreateInfluencerProfileInput = {
      user_id: user.id,
      display_name: 'Database Test Influencer',
      bio: 'Testing database persistence',
      follower_count: 5000,
      engagement_rate: 2.5
    };

    const result = await createInfluencerProfile(testInput);

    // Query database to verify profile was saved
    const profiles = await db.select()
      .from(influencerProfilesTable)
      .where(eq(influencerProfilesTable.id, result.id))
      .execute();

    expect(profiles).toHaveLength(1);
    expect(profiles[0].user_id).toEqual(user.id);
    expect(profiles[0].display_name).toEqual('Database Test Influencer');
    expect(profiles[0].bio).toEqual('Testing database persistence');
    expect(profiles[0].follower_count).toEqual(5000);
    expect(parseFloat(profiles[0].engagement_rate!)).toEqual(2.5);
    expect(profiles[0].created_at).toBeInstanceOf(Date);
    expect(profiles[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle numeric conversion for engagement_rate correctly', async () => {
    const user = await createTestUser('influencer');
    
    const testInput: CreateInfluencerProfileInput = {
      user_id: user.id,
      display_name: 'Numeric Test Influencer',
      engagement_rate: 4.85
    };

    const result = await createInfluencerProfile(testInput);

    // Verify engagement_rate is returned as a number
    expect(typeof result.engagement_rate).toBe('number');
    expect(result.engagement_rate).toEqual(4.85);

    // Verify it's stored correctly in database
    const profiles = await db.select()
      .from(influencerProfilesTable)
      .where(eq(influencerProfilesTable.id, result.id))
      .execute();

    expect(parseFloat(profiles[0].engagement_rate!)).toEqual(4.85);
  });

  it('should throw error for non-existent user', async () => {
    const testInput: CreateInfluencerProfileInput = {
      user_id: 99999, // Non-existent user ID
      display_name: 'Non-existent User Profile'
    };

    await expect(createInfluencerProfile(testInput))
      .rejects.toThrow(/user not found/i);
  });

  it('should throw error for non-influencer user type', async () => {
    const user = await createTestUser('brand'); // Create brand user instead
    
    const testInput: CreateInfluencerProfileInput = {
      user_id: user.id,
      display_name: 'Brand User Profile'
    };

    await expect(createInfluencerProfile(testInput))
      .rejects.toThrow(/user must be of type "influencer"/i);
  });

  it('should handle null/undefined optional fields correctly', async () => {
    const user = await createTestUser('influencer');
    
    const testInput: CreateInfluencerProfileInput = {
      user_id: user.id,
      display_name: 'Null Fields Test',
      bio: undefined,
      avatar_url: undefined,
      instagram_handle: null,
      tiktok_handle: null,
      youtube_handle: undefined,
      follower_count: null,
      engagement_rate: undefined,
      category: null
    };

    const result = await createInfluencerProfile(testInput);

    expect(result.bio).toBeNull();
    expect(result.avatar_url).toBeNull();
    expect(result.instagram_handle).toBeNull();
    expect(result.tiktok_handle).toBeNull();
    expect(result.youtube_handle).toBeNull();
    expect(result.follower_count).toBeNull();
    expect(result.engagement_rate).toBeNull();
    expect(result.category).toBeNull();
  });
});