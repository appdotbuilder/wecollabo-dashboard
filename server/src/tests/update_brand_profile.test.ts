import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, brandProfilesTable } from '../db/schema';
import { type UpdateBrandProfileInput, type CreateUserInput, type CreateBrandProfileInput } from '../schema';
import { updateBrandProfile } from '../handlers/update_brand_profile';
import { eq } from 'drizzle-orm';

describe('updateBrandProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUser: any;
  let testBrandProfile: any;
  let nonBrandUser: any;

  beforeEach(async () => {
    // Create a brand user
    const brandUserInput: CreateUserInput = {
      email: 'brand@test.com',
      password: 'password123',
      user_type: 'brand'
    };

    const brandUserResult = await db.insert(usersTable)
      .values(brandUserInput)
      .returning()
      .execute();
    testUser = brandUserResult[0];

    // Create a brand profile for the user
    const brandProfileInput: CreateBrandProfileInput = {
      user_id: testUser.id,
      company_name: 'Original Company',
      description: 'Original description',
      website: 'https://original.com',
      industry: 'Technology',
      logo_url: 'https://original.com/logo.png'
    };

    const brandProfileResult = await db.insert(brandProfilesTable)
      .values(brandProfileInput)
      .returning()
      .execute();
    testBrandProfile = brandProfileResult[0];

    // Create a non-brand user for testing
    const nonBrandUserInput: CreateUserInput = {
      email: 'influencer@test.com',
      password: 'password123',
      user_type: 'influencer'
    };

    const nonBrandUserResult = await db.insert(usersTable)
      .values(nonBrandUserInput)
      .returning()
      .execute();
    nonBrandUser = nonBrandUserResult[0];
  });

  it('should update brand profile with all fields', async () => {
    const updateInput: UpdateBrandProfileInput = {
      user_id: testUser.id,
      company_name: 'Updated Company',
      description: 'Updated description',
      website: 'https://updated.com',
      industry: 'Finance',
      logo_url: 'https://updated.com/logo.png'
    };

    const result = await updateBrandProfile(updateInput);

    // Verify returned profile
    expect(result.id).toBe(testBrandProfile.id);
    expect(result.user_id).toBe(testUser.id);
    expect(result.company_name).toBe('Updated Company');
    expect(result.description).toBe('Updated description');
    expect(result.website).toBe('https://updated.com');
    expect(result.industry).toBe('Finance');
    expect(result.logo_url).toBe('https://updated.com/logo.png');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testBrandProfile.updated_at).toBe(true);
  });

  it('should update brand profile with partial fields', async () => {
    const updateInput: UpdateBrandProfileInput = {
      user_id: testUser.id,
      company_name: 'Partially Updated Company',
      industry: 'Healthcare'
    };

    const result = await updateBrandProfile(updateInput);

    // Verify updated fields
    expect(result.company_name).toBe('Partially Updated Company');
    expect(result.industry).toBe('Healthcare');
    
    // Verify unchanged fields remain the same
    expect(result.description).toBe('Original description');
    expect(result.website).toBe('https://original.com');
    expect(result.logo_url).toBe('https://original.com/logo.png');
  });

  it('should update nullable fields to null', async () => {
    const updateInput: UpdateBrandProfileInput = {
      user_id: testUser.id,
      description: null,
      website: null,
      logo_url: null
    };

    const result = await updateBrandProfile(updateInput);

    expect(result.description).toBeNull();
    expect(result.website).toBeNull();
    expect(result.logo_url).toBeNull();
    // Company name should remain unchanged
    expect(result.company_name).toBe('Original Company');
  });

  it('should update brand profile in database', async () => {
    const updateInput: UpdateBrandProfileInput = {
      user_id: testUser.id,
      company_name: 'Database Updated Company',
      description: 'Database updated description'
    };

    await updateBrandProfile(updateInput);

    // Verify the update persisted in database
    const profiles = await db.select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.user_id, testUser.id))
      .execute();

    expect(profiles).toHaveLength(1);
    expect(profiles[0].company_name).toBe('Database Updated Company');
    expect(profiles[0].description).toBe('Database updated description');
    expect(profiles[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when user does not exist', async () => {
    const updateInput: UpdateBrandProfileInput = {
      user_id: 99999, // Non-existent user ID
      company_name: 'Updated Company'
    };

    await expect(updateBrandProfile(updateInput)).rejects.toThrow(/user not found/i);
  });

  it('should throw error when user is not a brand user', async () => {
    const updateInput: UpdateBrandProfileInput = {
      user_id: nonBrandUser.id, // This is an influencer user
      company_name: 'Updated Company'
    };

    await expect(updateBrandProfile(updateInput)).rejects.toThrow(/user is not a brand user/i);
  });

  it('should throw error when brand profile does not exist', async () => {
    // Create another brand user without a brand profile
    const anotherBrandUserInput: CreateUserInput = {
      email: 'brand2@test.com',
      password: 'password123',
      user_type: 'brand'
    };

    const anotherBrandUserResult = await db.insert(usersTable)
      .values(anotherBrandUserInput)
      .returning()
      .execute();

    const updateInput: UpdateBrandProfileInput = {
      user_id: anotherBrandUserResult[0].id,
      company_name: 'Updated Company'
    };

    await expect(updateBrandProfile(updateInput)).rejects.toThrow(/brand profile not found/i);
  });

  it('should handle empty update gracefully', async () => {
    const updateInput: UpdateBrandProfileInput = {
      user_id: testUser.id
      // No other fields provided
    };

    const result = await updateBrandProfile(updateInput);

    // Should return existing data with updated timestamp
    expect(result.company_name).toBe('Original Company');
    expect(result.description).toBe('Original description');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testBrandProfile.updated_at).toBe(true);
  });
});