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

  // Helper function to create a test user
  const createTestUser = async (userType: 'influencer' | 'brand' = 'influencer') => {
    const result = await db.insert(usersTable)
      .values({
        email: `test-${Date.now()}@example.com`,
        password_hash: 'hashed_password',
        user_type: userType
      })
      .returning()
      .execute();
    
    return result[0];
  };

  const testInput: CreateInfluencerProfileInput = {
    user_id: 1, // Will be overridden in tests
    display_name: 'Test Influencer',
    bio: 'A test influencer profile',
    profile_image: 'https://example.com/profile.jpg',
    total_reach: 50000,
    engagement_rate: 4.5
  };

  it('should create an influencer profile successfully', async () => {
    const user = await createTestUser('influencer');
    const input = { ...testInput, user_id: user.id };

    const result = await createInfluencerProfile(input);

    // Basic field validation
    expect(result.id).toBeDefined();
    expect(result.user_id).toEqual(user.id);
    expect(result.display_name).toEqual('Test Influencer');
    expect(result.bio).toEqual('A test influencer profile');
    expect(result.profile_image).toEqual('https://example.com/profile.jpg');
    expect(result.total_reach).toEqual(50000);
    expect(result.engagement_rate).toEqual(4.5);
    expect(result.total_collaborations).toEqual(0);
    expect(result.rating).toEqual(0);
    expect(result.total_earnings).toEqual(0);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric types
    expect(typeof result.engagement_rate).toBe('number');
    expect(typeof result.rating).toBe('number');
    expect(typeof result.total_earnings).toBe('number');
  });

  it('should save influencer profile to database', async () => {
    const user = await createTestUser('influencer');
    const input = { ...testInput, user_id: user.id };

    const result = await createInfluencerProfile(input);

    // Query database to verify record was saved
    const profiles = await db.select()
      .from(influencerProfilesTable)
      .where(eq(influencerProfilesTable.id, result.id))
      .execute();

    expect(profiles).toHaveLength(1);
    expect(profiles[0].user_id).toEqual(user.id);
    expect(profiles[0].display_name).toEqual('Test Influencer');
    expect(profiles[0].bio).toEqual('A test influencer profile');
    expect(profiles[0].profile_image).toEqual('https://example.com/profile.jpg');
    expect(profiles[0].total_reach).toEqual(50000);
    expect(parseFloat(profiles[0].engagement_rate)).toEqual(4.5);
    expect(profiles[0].total_collaborations).toEqual(0);
    expect(parseFloat(profiles[0].rating)).toEqual(0);
    expect(parseFloat(profiles[0].total_earnings)).toEqual(0);
  });

  it('should handle optional fields correctly', async () => {
    const user = await createTestUser('influencer');
    const input = {
      user_id: user.id,
      display_name: 'Minimal Influencer',
      total_reach: 10000,
      engagement_rate: 2.8
    };

    const result = await createInfluencerProfile(input);

    expect(result.display_name).toEqual('Minimal Influencer');
    expect(result.bio).toBeNull();
    expect(result.profile_image).toBeNull();
    expect(result.total_reach).toEqual(10000);
    expect(result.engagement_rate).toEqual(2.8);
  });

  it('should throw error if user does not exist', async () => {
    const input = { ...testInput, user_id: 99999 };

    await expect(createInfluencerProfile(input)).rejects.toThrow(/User with id 99999 not found/i);
  });

  it('should throw error if user is not an influencer', async () => {
    const user = await createTestUser('brand');
    const input = { ...testInput, user_id: user.id };

    await expect(createInfluencerProfile(input)).rejects.toThrow(/is not an influencer/i);
  });

  it('should throw error if influencer profile already exists', async () => {
    const user = await createTestUser('influencer');
    const input = { ...testInput, user_id: user.id };

    // Create first profile
    await createInfluencerProfile(input);

    // Attempt to create second profile for same user
    await expect(createInfluencerProfile(input)).rejects.toThrow(/Influencer profile already exists/i);
  });

  it('should handle high engagement rate values', async () => {
    const user = await createTestUser('influencer');
    const input = {
      ...testInput,
      user_id: user.id,
      engagement_rate: 95.75,
      total_reach: 1000000
    };

    const result = await createInfluencerProfile(input);

    expect(result.engagement_rate).toEqual(95.75);
    expect(result.total_reach).toEqual(1000000);
    expect(typeof result.engagement_rate).toBe('number');
  });

  it('should handle zero engagement rate and reach', async () => {
    const user = await createTestUser('influencer');
    const input = {
      ...testInput,
      user_id: user.id,
      engagement_rate: 0,
      total_reach: 0
    };

    const result = await createInfluencerProfile(input);

    expect(result.engagement_rate).toEqual(0);
    expect(result.total_reach).toEqual(0);
    expect(typeof result.engagement_rate).toBe('number');
  });
});