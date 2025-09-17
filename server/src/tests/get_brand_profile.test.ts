import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, brandProfilesTable } from '../db/schema';
import { type CreateUserInput, type CreateBrandProfileInput } from '../schema';
import { getBrandProfile } from '../handlers/get_brand_profile';

// Test user data
const testUser: CreateUserInput = {
  email: 'brand@test.com',
  password_hash: 'hashed_password',
  user_type: 'brand'
};

// Test brand profile data
const testBrandProfile: CreateBrandProfileInput = {
  user_id: 1, // Will be updated after user creation
  company_name: 'Test Brand Corp',
  company_description: 'A test brand for unit testing',
  logo: 'https://example.com/logo.png',
  website: 'https://testbrand.com',
  industry: 'Technology'
};

describe('getBrandProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return brand profile when found', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create brand profile
    await db.insert(brandProfilesTable)
      .values({
        ...testBrandProfile,
        user_id: userId
      })
      .execute();

    // Test the handler
    const result = await getBrandProfile(userId);

    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual(userId);
    expect(result!.company_name).toEqual('Test Brand Corp');
    expect(result!.company_description).toEqual('A test brand for unit testing');
    expect(result!.logo).toEqual('https://example.com/logo.png');
    expect(result!.website).toEqual('https://testbrand.com');
    expect(result!.industry).toEqual('Technology');
    expect(result!.total_campaigns).toEqual(0);
    expect(result!.rating).toEqual(0);
    expect(typeof result!.rating).toBe('number');
    expect(result!.id).toBeDefined();
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);
  });

  it('should return null when brand profile not found', async () => {
    // Test with non-existent user ID
    const result = await getBrandProfile(999);

    expect(result).toBeNull();
  });

  it('should handle profile with null optional fields', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create minimal brand profile (only required fields)
    await db.insert(brandProfilesTable)
      .values({
        user_id: userId,
        company_name: 'Minimal Brand'
      })
      .execute();

    const result = await getBrandProfile(userId);

    expect(result).not.toBeNull();
    expect(result!.user_id).toEqual(userId);
    expect(result!.company_name).toEqual('Minimal Brand');
    expect(result!.company_description).toBeNull();
    expect(result!.logo).toBeNull();
    expect(result!.website).toBeNull();
    expect(result!.industry).toBeNull();
    expect(result!.total_campaigns).toEqual(0);
    expect(result!.rating).toEqual(0);
    expect(typeof result!.rating).toBe('number');
  });

  it('should handle profile with custom rating and campaign counts', async () => {
    // Create test user first
    const userResult = await db.insert(usersTable)
      .values(testUser)
      .returning()
      .execute();
    
    const userId = userResult[0].id;

    // Create brand profile with custom values
    await db.insert(brandProfilesTable)
      .values({
        user_id: userId,
        company_name: 'Rated Brand',
        total_campaigns: 5,
        rating: '4.5' // String in database, should be converted to number
      })
      .execute();

    const result = await getBrandProfile(userId);

    expect(result).not.toBeNull();
    expect(result!.company_name).toEqual('Rated Brand');
    expect(result!.total_campaigns).toEqual(5);
    expect(result!.rating).toEqual(4.5);
    expect(typeof result!.rating).toBe('number');
  });

  it('should query correct brand profile when multiple users exist', async () => {
    // Create first user and brand profile
    const user1Result = await db.insert(usersTable)
      .values({ ...testUser, email: 'brand1@test.com' })
      .returning()
      .execute();
    
    await db.insert(brandProfilesTable)
      .values({
        user_id: user1Result[0].id,
        company_name: 'Brand One'
      })
      .execute();

    // Create second user and brand profile
    const user2Result = await db.insert(usersTable)
      .values({ ...testUser, email: 'brand2@test.com' })
      .returning()
      .execute();
    
    await db.insert(brandProfilesTable)
      .values({
        user_id: user2Result[0].id,
        company_name: 'Brand Two'
      })
      .execute();

    // Test fetching first brand profile
    const result1 = await getBrandProfile(user1Result[0].id);
    expect(result1).not.toBeNull();
    expect(result1!.company_name).toEqual('Brand One');
    expect(result1!.user_id).toEqual(user1Result[0].id);

    // Test fetching second brand profile
    const result2 = await getBrandProfile(user2Result[0].id);
    expect(result2).not.toBeNull();
    expect(result2!.company_name).toEqual('Brand Two');
    expect(result2!.user_id).toEqual(user2Result[0].id);
  });
});