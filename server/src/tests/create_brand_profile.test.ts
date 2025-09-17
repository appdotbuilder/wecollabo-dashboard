import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { brandProfilesTable, usersTable } from '../db/schema';
import { type CreateBrandProfileInput } from '../schema';
import { createBrandProfile } from '../handlers/create_brand_profile';
import { eq } from 'drizzle-orm';

// Test brand user
const testBrandUser = {
  email: 'brand@test.com',
  password: 'password123',
  user_type: 'brand' as const
};

// Test influencer user (for negative testing)
const testInfluencerUser = {
  email: 'influencer@test.com', 
  password: 'password123',
  user_type: 'influencer' as const
};

describe('createBrandProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a brand profile for a valid brand user', async () => {
    // Create test brand user first
    const userResult = await db.insert(usersTable)
      .values(testBrandUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const testInput: CreateBrandProfileInput = {
      user_id: userId,
      company_name: 'Test Company',
      description: 'A test company description',
      website: 'https://testcompany.com',
      industry: 'Technology',
      logo_url: 'https://example.com/logo.png'
    };

    const result = await createBrandProfile(testInput);

    // Verify all fields
    expect(result.user_id).toEqual(userId);
    expect(result.company_name).toEqual('Test Company');
    expect(result.description).toEqual('A test company description');
    expect(result.website).toEqual('https://testcompany.com');
    expect(result.industry).toEqual('Technology');
    expect(result.logo_url).toEqual('https://example.com/logo.png');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a brand profile with optional fields as null', async () => {
    // Create test brand user first
    const userResult = await db.insert(usersTable)
      .values(testBrandUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const testInput: CreateBrandProfileInput = {
      user_id: userId,
      company_name: 'Minimal Company'
    };

    const result = await createBrandProfile(testInput);

    expect(result.user_id).toEqual(userId);
    expect(result.company_name).toEqual('Minimal Company');
    expect(result.description).toBeNull();
    expect(result.website).toBeNull();
    expect(result.industry).toBeNull();
    expect(result.logo_url).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save brand profile to database', async () => {
    // Create test brand user first
    const userResult = await db.insert(usersTable)
      .values(testBrandUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const testInput: CreateBrandProfileInput = {
      user_id: userId,
      company_name: 'Database Test Company',
      description: 'Testing database persistence',
      website: 'https://dbtest.com',
      industry: 'Testing',
      logo_url: 'https://example.com/dblogo.png'
    };

    const result = await createBrandProfile(testInput);

    // Query the database to verify the record was saved
    const profiles = await db.select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.id, result.id))
      .execute();

    expect(profiles).toHaveLength(1);
    expect(profiles[0].user_id).toEqual(userId);
    expect(profiles[0].company_name).toEqual('Database Test Company');
    expect(profiles[0].description).toEqual('Testing database persistence');
    expect(profiles[0].website).toEqual('https://dbtest.com');
    expect(profiles[0].industry).toEqual('Testing');
    expect(profiles[0].logo_url).toEqual('https://example.com/dblogo.png');
    expect(profiles[0].created_at).toBeInstanceOf(Date);
    expect(profiles[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent user', async () => {
    const testInput: CreateBrandProfileInput = {
      user_id: 999999, // Non-existent user ID
      company_name: 'Test Company'
    };

    await expect(createBrandProfile(testInput)).rejects.toThrow(/User with id 999999 not found/i);
  });

  it('should throw error for non-brand user type', async () => {
    // Create test influencer user first
    const userResult = await db.insert(usersTable)
      .values(testInfluencerUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const testInput: CreateBrandProfileInput = {
      user_id: userId,
      company_name: 'Should Fail Company'
    };

    await expect(createBrandProfile(testInput)).rejects.toThrow(/User with id .* is not a brand user/i);
  });

  it('should handle undefined optional fields correctly', async () => {
    // Create test brand user first
    const userResult = await db.insert(usersTable)
      .values(testBrandUser)
      .returning()
      .execute();
    const userId = userResult[0].id;

    const testInput: CreateBrandProfileInput = {
      user_id: userId,
      company_name: 'Undefined Fields Company',
      description: undefined,
      website: undefined,
      industry: undefined,
      logo_url: undefined
    };

    const result = await createBrandProfile(testInput);

    expect(result.user_id).toEqual(userId);
    expect(result.company_name).toEqual('Undefined Fields Company');
    expect(result.description).toBeNull();
    expect(result.website).toBeNull();
    expect(result.industry).toBeNull();
    expect(result.logo_url).toBeNull();
  });
});