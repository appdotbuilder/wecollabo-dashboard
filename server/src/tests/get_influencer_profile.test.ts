import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, influencerProfilesTable } from '../db/schema';
import { type CreateUserInput, type CreateInfluencerProfileInput } from '../schema';
import { getInfluencerProfile } from '../handlers/get_influencer_profile';

// Test data
const testUser: CreateUserInput = {
  email: 'influencer@test.com',
  password_hash: 'hashed_password',
  user_type: 'influencer'
};

const testInfluencerProfile: CreateInfluencerProfileInput = {
  user_id: 1, // Will be updated after user creation
  display_name: 'Test Influencer',
  bio: 'A test influencer profile',
  profile_image: 'https://example.com/profile.jpg',
  total_reach: 50000,
  engagement_rate: 5.75
};

describe('getInfluencerProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return influencer profile by user ID', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create influencer profile
    await db.insert(influencerProfilesTable)
      .values({
        ...testInfluencerProfile,
        user_id: userId,
        engagement_rate: testInfluencerProfile.engagement_rate.toString(),
        rating: '4.5',
        total_earnings: '2500.75'
      })
      .execute();

    const result = await getInfluencerProfile(userId);

    expect(result).toBeDefined();
    expect(result!.user_id).toEqual(userId);
    expect(result!.display_name).toEqual('Test Influencer');
    expect(result!.bio).toEqual('A test influencer profile');
    expect(result!.profile_image).toEqual('https://example.com/profile.jpg');
    expect(result!.total_reach).toEqual(50000);
    expect(result!.engagement_rate).toEqual(5.75);
    expect(typeof result!.engagement_rate).toBe('number');
    expect(result!.total_collaborations).toEqual(0);
    expect(result!.rating).toEqual(4.5);
    expect(typeof result!.rating).toBe('number');
    expect(result!.total_earnings).toEqual(2500.75);
    expect(typeof result!.total_earnings).toBe('number');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null for non-existent user ID', async () => {
    const result = await getInfluencerProfile(999);
    expect(result).toBeNull();
  });

  it('should return null for user without influencer profile', async () => {
    // Create user without influencer profile
    const userResult = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hashed_password',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const userId = userResult[0].id;
    const result = await getInfluencerProfile(userId);
    expect(result).toBeNull();
  });

  it('should handle profiles with null optional fields', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create influencer profile with minimal data
    await db.insert(influencerProfilesTable)
      .values({
        user_id: userId,
        display_name: 'Minimal Profile',
        bio: null,
        profile_image: null,
        total_reach: 1000,
        engagement_rate: '2.5',
        total_collaborations: 0,
        rating: '0',
        total_earnings: '0'
      })
      .execute();

    const result = await getInfluencerProfile(userId);

    expect(result).toBeDefined();
    expect(result!.display_name).toEqual('Minimal Profile');
    expect(result!.bio).toBeNull();
    expect(result!.profile_image).toBeNull();
    expect(result!.total_reach).toEqual(1000);
    expect(result!.engagement_rate).toEqual(2.5);
    expect(typeof result!.engagement_rate).toBe('number');
    expect(result!.rating).toEqual(0);
    expect(typeof result!.rating).toBe('number');
    expect(result!.total_earnings).toEqual(0);
    expect(typeof result!.total_earnings).toBe('number');
  });

  it('should handle high precision numeric values correctly', async () => {
    // Create user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create influencer profile with high precision values
    await db.insert(influencerProfilesTable)
      .values({
        user_id: userId,
        display_name: 'Precision Test',
        total_reach: 100000,
        engagement_rate: '12.34', // High precision engagement rate
        total_collaborations: 25,
        rating: '4.89', // High precision rating
        total_earnings: '15000.99' // High precision earnings
      })
      .execute();

    const result = await getInfluencerProfile(userId);

    expect(result).toBeDefined();
    expect(result!.engagement_rate).toEqual(12.34);
    expect(result!.rating).toEqual(4.89);
    expect(result!.total_earnings).toEqual(15000.99);
    expect(typeof result!.engagement_rate).toBe('number');
    expect(typeof result!.rating).toBe('number');
    expect(typeof result!.total_earnings).toBe('number');
  });
});