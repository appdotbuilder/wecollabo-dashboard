import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, brandProfilesTable, influencerProfilesTable } from '../db/schema';
import { type GetUserProfileInput, type CreateUserInput, type CreateBrandProfileInput, type CreateInfluencerProfileInput } from '../schema';
import { getUserProfile } from '../handlers/get_user_profile';

describe('getUserProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should get user profile with brand profile', async () => {
    // Create a brand user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'brand@example.com',
        password: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create brand profile
    const brandProfileResult = await db.insert(brandProfilesTable)
      .values({
        user_id: user.id,
        company_name: 'Test Company',
        description: 'A test company',
        website: 'https://test.com',
        industry: 'Technology',
        logo_url: 'https://logo.com/test.png'
      })
      .returning()
      .execute();

    const brandProfile = brandProfileResult[0];

    const input: GetUserProfileInput = { user_id: user.id };
    const result = await getUserProfile(input);

    // Validate user data
    expect(result.user.id).toBe(user.id);
    expect(result.user.email).toBe('brand@example.com');
    expect(result.user.user_type).toBe('brand');
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Validate brand profile data
    expect(result.brandProfile).toBeDefined();
    expect(result.brandProfile!.id).toBe(brandProfile.id);
    expect(result.brandProfile!.user_id).toBe(user.id);
    expect(result.brandProfile!.company_name).toBe('Test Company');
    expect(result.brandProfile!.description).toBe('A test company');
    expect(result.brandProfile!.website).toBe('https://test.com');
    expect(result.brandProfile!.industry).toBe('Technology');
    expect(result.brandProfile!.logo_url).toBe('https://logo.com/test.png');
    expect(result.brandProfile!.created_at).toBeInstanceOf(Date);
    expect(result.brandProfile!.updated_at).toBeInstanceOf(Date);

    // Should not have influencer profile
    expect(result.influencerProfile).toBeUndefined();
  });

  it('should get user profile with influencer profile', async () => {
    // Create an influencer user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'influencer@example.com',
        password: 'hashedpassword',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create influencer profile
    const influencerProfileResult = await db.insert(influencerProfilesTable)
      .values({
        user_id: user.id,
        display_name: 'Test Influencer',
        bio: 'A test influencer',
        avatar_url: 'https://avatar.com/test.jpg',
        instagram_handle: '@testinfluencer',
        tiktok_handle: '@tiktoktest',
        youtube_handle: '@youtubetest',
        follower_count: 50000,
        engagement_rate: '3.45', // Store as string (numeric)
        category: 'Lifestyle'
      })
      .returning()
      .execute();

    const influencerProfile = influencerProfileResult[0];

    const input: GetUserProfileInput = { user_id: user.id };
    const result = await getUserProfile(input);

    // Validate user data
    expect(result.user.id).toBe(user.id);
    expect(result.user.email).toBe('influencer@example.com');
    expect(result.user.user_type).toBe('influencer');
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Validate influencer profile data
    expect(result.influencerProfile).toBeDefined();
    expect(result.influencerProfile!.id).toBe(influencerProfile.id);
    expect(result.influencerProfile!.user_id).toBe(user.id);
    expect(result.influencerProfile!.display_name).toBe('Test Influencer');
    expect(result.influencerProfile!.bio).toBe('A test influencer');
    expect(result.influencerProfile!.avatar_url).toBe('https://avatar.com/test.jpg');
    expect(result.influencerProfile!.instagram_handle).toBe('@testinfluencer');
    expect(result.influencerProfile!.tiktok_handle).toBe('@tiktoktest');
    expect(result.influencerProfile!.youtube_handle).toBe('@youtubetest');
    expect(result.influencerProfile!.follower_count).toBe(50000);
    expect(result.influencerProfile!.engagement_rate).toBe(3.45); // Converted to number
    expect(typeof result.influencerProfile!.engagement_rate).toBe('number');
    expect(result.influencerProfile!.category).toBe('Lifestyle');
    expect(result.influencerProfile!.created_at).toBeInstanceOf(Date);
    expect(result.influencerProfile!.updated_at).toBeInstanceOf(Date);

    // Should not have brand profile
    expect(result.brandProfile).toBeUndefined();
  });

  it('should get user without profile', async () => {
    // Create a brand user without a profile
    const userResult = await db.insert(usersTable)
      .values({
        email: 'noprofile@example.com',
        password: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const user = userResult[0];

    const input: GetUserProfileInput = { user_id: user.id };
    const result = await getUserProfile(input);

    // Validate user data
    expect(result.user.id).toBe(user.id);
    expect(result.user.email).toBe('noprofile@example.com');
    expect(result.user.user_type).toBe('brand');
    expect(result.user.created_at).toBeInstanceOf(Date);
    expect(result.user.updated_at).toBeInstanceOf(Date);

    // Should not have any profiles
    expect(result.brandProfile).toBeUndefined();
    expect(result.influencerProfile).toBeUndefined();
  });

  it('should handle influencer profile with null engagement_rate', async () => {
    // Create an influencer user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'influencer2@example.com',
        password: 'hashedpassword',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const user = userResult[0];

    // Create influencer profile with null engagement_rate
    await db.insert(influencerProfilesTable)
      .values({
        user_id: user.id,
        display_name: 'Test Influencer 2',
        bio: null,
        avatar_url: null,
        instagram_handle: null,
        tiktok_handle: null,
        youtube_handle: null,
        follower_count: null,
        engagement_rate: null,
        category: null
      })
      .returning()
      .execute();

    const input: GetUserProfileInput = { user_id: user.id };
    const result = await getUserProfile(input);

    // Validate user data
    expect(result.user.id).toBe(user.id);
    expect(result.user.email).toBe('influencer2@example.com');
    expect(result.user.user_type).toBe('influencer');

    // Validate influencer profile with null values
    expect(result.influencerProfile).toBeDefined();
    expect(result.influencerProfile!.display_name).toBe('Test Influencer 2');
    expect(result.influencerProfile!.bio).toBeNull();
    expect(result.influencerProfile!.avatar_url).toBeNull();
    expect(result.influencerProfile!.instagram_handle).toBeNull();
    expect(result.influencerProfile!.tiktok_handle).toBeNull();
    expect(result.influencerProfile!.youtube_handle).toBeNull();
    expect(result.influencerProfile!.follower_count).toBeNull();
    expect(result.influencerProfile!.engagement_rate).toBeNull();
    expect(result.influencerProfile!.category).toBeNull();
  });

  it('should throw error for non-existent user', async () => {
    const input: GetUserProfileInput = { user_id: 999 };
    
    await expect(getUserProfile(input)).rejects.toThrow(/User with id 999 not found/i);
  });
});