import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, influencerProfilesTable } from '../db/schema';
import { getInfluencerProfiles } from '../handlers/get_influencer_profiles';
import { type CreateUserInput, type CreateInfluencerProfileInput } from '../schema';

// Test data
const testUser1: CreateUserInput = {
  email: 'influencer1@test.com',
  password: 'password123',
  user_type: 'influencer'
};

const testUser2: CreateUserInput = {
  email: 'influencer2@test.com',
  password: 'password456',
  user_type: 'influencer'
};

const testInfluencerProfile1: CreateInfluencerProfileInput = {
  user_id: 1, // Will be set after user creation
  display_name: 'Fashion Guru',
  bio: 'Fashion and lifestyle content creator',
  avatar_url: 'https://example.com/avatar1.jpg',
  instagram_handle: '@fashion_guru',
  tiktok_handle: '@fashionguru',
  youtube_handle: 'Fashion Guru',
  follower_count: 75000,
  engagement_rate: 4.2,
  category: 'Fashion'
};

const testInfluencerProfile2: CreateInfluencerProfileInput = {
  user_id: 2, // Will be set after user creation
  display_name: 'Tech Reviewer',
  bio: 'Latest tech reviews and tutorials',
  avatar_url: null,
  instagram_handle: '@tech_reviewer',
  tiktok_handle: null,
  youtube_handle: 'Tech Reviews',
  follower_count: 120000,
  engagement_rate: 3.8,
  category: 'Technology'
};

const testInfluencerProfile3: CreateInfluencerProfileInput = {
  user_id: 3, // Will be set after user creation
  display_name: 'Fitness Coach',
  bio: null,
  avatar_url: null,
  instagram_handle: null,
  tiktok_handle: null,
  youtube_handle: null,
  follower_count: null,
  engagement_rate: null,
  category: null
};

describe('getInfluencerProfiles', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no influencer profiles exist', async () => {
    const result = await getInfluencerProfiles();

    expect(result).toEqual([]);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return all influencer profiles', async () => {
    // Create test users first
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    // Create influencer profiles
    const profile1 = { ...testInfluencerProfile1, user_id: users[0].id };
    const profile2 = { ...testInfluencerProfile2, user_id: users[1].id };

    await db.insert(influencerProfilesTable)
      .values([
        {
          ...profile1,
          engagement_rate: profile1.engagement_rate?.toString()
        },
        {
          ...profile2,
          engagement_rate: profile2.engagement_rate?.toString()
        }
      ])
      .execute();

    const result = await getInfluencerProfiles();

    expect(result).toHaveLength(2);
    
    // Check first profile
    const firstProfile = result.find(p => p.display_name === 'Fashion Guru');
    expect(firstProfile).toBeDefined();
    expect(firstProfile!.user_id).toEqual(users[0].id);
    expect(firstProfile!.bio).toEqual('Fashion and lifestyle content creator');
    expect(firstProfile!.instagram_handle).toEqual('@fashion_guru');
    expect(firstProfile!.follower_count).toEqual(75000);
    expect(firstProfile!.engagement_rate).toEqual(4.2);
    expect(typeof firstProfile!.engagement_rate).toBe('number');
    expect(firstProfile!.category).toEqual('Fashion');

    // Check second profile
    const secondProfile = result.find(p => p.display_name === 'Tech Reviewer');
    expect(secondProfile).toBeDefined();
    expect(secondProfile!.user_id).toEqual(users[1].id);
    expect(secondProfile!.bio).toEqual('Latest tech reviews and tutorials');
    expect(secondProfile!.youtube_handle).toEqual('Tech Reviews');
    expect(secondProfile!.follower_count).toEqual(120000);
    expect(secondProfile!.engagement_rate).toEqual(3.8);
    expect(typeof secondProfile!.engagement_rate).toBe('number');
    expect(secondProfile!.category).toEqual('Technology');
  });

  it('should handle profiles with null values correctly', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    // Create influencer profile with null values
    const profile = { ...testInfluencerProfile3, user_id: user[0].id };

    await db.insert(influencerProfilesTable)
      .values({
        ...profile,
        engagement_rate: profile.engagement_rate?.toString() || null
      })
      .execute();

    const result = await getInfluencerProfiles();

    expect(result).toHaveLength(1);
    
    const profile_result = result[0];
    expect(profile_result.display_name).toEqual('Fitness Coach');
    expect(profile_result.bio).toBeNull();
    expect(profile_result.avatar_url).toBeNull();
    expect(profile_result.instagram_handle).toBeNull();
    expect(profile_result.tiktok_handle).toBeNull();
    expect(profile_result.youtube_handle).toBeNull();
    expect(profile_result.follower_count).toBeNull();
    expect(profile_result.engagement_rate).toBeNull();
    expect(profile_result.category).toBeNull();
    expect(profile_result.id).toBeDefined();
    expect(profile_result.created_at).toBeInstanceOf(Date);
    expect(profile_result.updated_at).toBeInstanceOf(Date);
  });

  it('should return profiles ordered by creation time', async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2])
      .returning()
      .execute();

    // Create profiles with slight delay to ensure different timestamps
    const profile1 = { ...testInfluencerProfile1, user_id: users[0].id };
    await db.insert(influencerProfilesTable)
      .values({
        ...profile1,
        engagement_rate: profile1.engagement_rate?.toString()
      })
      .execute();

    // Small delay to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const profile2 = { ...testInfluencerProfile2, user_id: users[1].id };
    await db.insert(influencerProfilesTable)
      .values({
        ...profile2,
        engagement_rate: profile2.engagement_rate?.toString()
      })
      .execute();

    const result = await getInfluencerProfiles();

    expect(result).toHaveLength(2);
    // First created should appear first (assuming default ordering)
    expect(result[0].display_name).toEqual('Fashion Guru');
    expect(result[1].display_name).toEqual('Tech Reviewer');
    expect(result[0].created_at.getTime()).toBeLessThanOrEqual(result[1].created_at.getTime());
  });

  it('should handle numeric conversion correctly for engagement_rate', async () => {
    // Create test user
    const user = await db.insert(usersTable)
      .values(testUser1)
      .returning()
      .execute();

    // Create profile with specific engagement rate
    const profile = { ...testInfluencerProfile1, user_id: user[0].id };
    await db.insert(influencerProfilesTable)
      .values({
        ...profile,
        engagement_rate: '5.75' // Insert as string (how numeric is stored)
      })
      .execute();

    const result = await getInfluencerProfiles();

    expect(result).toHaveLength(1);
    expect(result[0].engagement_rate).toEqual(5.75);
    expect(typeof result[0].engagement_rate).toBe('number');
  });
});