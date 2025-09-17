import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, brandProfilesTable } from '../db/schema';
import { type CreateBrandProfileInput } from '../schema';
import { createBrandProfile } from '../handlers/create_brand_profile';
import { eq } from 'drizzle-orm';

// Test input for brand profile creation
const testInput: CreateBrandProfileInput = {
  user_id: 1,
  company_name: 'Test Company',
  company_description: 'A test company',
  logo: 'https://example.com/logo.png',
  website: 'https://testcompany.com',
  industry: 'Technology'
};

describe('createBrandProfile', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a brand profile successfully', async () => {
    // Create a brand user first
    await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hashed_password',
        user_type: 'brand'
      })
      .execute();

    const result = await createBrandProfile(testInput);

    // Verify all fields are correctly set
    expect(result.user_id).toEqual(1);
    expect(result.company_name).toEqual('Test Company');
    expect(result.company_description).toEqual('A test company');
    expect(result.logo).toEqual('https://example.com/logo.png');
    expect(result.website).toEqual('https://testcompany.com');
    expect(result.industry).toEqual('Technology');
    expect(result.total_campaigns).toEqual(0);
    expect(result.rating).toEqual(0);
    expect(typeof result.rating).toEqual('number');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create brand profile with minimal required fields', async () => {
    // Create a brand user first
    await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hashed_password',
        user_type: 'brand'
      })
      .execute();

    const minimalInput: CreateBrandProfileInput = {
      user_id: 1,
      company_name: 'Minimal Company'
    };

    const result = await createBrandProfile(minimalInput);

    expect(result.user_id).toEqual(1);
    expect(result.company_name).toEqual('Minimal Company');
    expect(result.company_description).toBeNull();
    expect(result.logo).toBeNull();
    expect(result.website).toBeNull();
    expect(result.industry).toBeNull();
    expect(result.total_campaigns).toEqual(0);
    expect(result.rating).toEqual(0);
    expect(result.id).toBeDefined();
  });

  it('should save brand profile to database', async () => {
    // Create a brand user first
    await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hashed_password',
        user_type: 'brand'
      })
      .execute();

    const result = await createBrandProfile(testInput);

    // Query the database to verify the profile was saved
    const profiles = await db.select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.id, result.id))
      .execute();

    expect(profiles).toHaveLength(1);
    expect(profiles[0].user_id).toEqual(1);
    expect(profiles[0].company_name).toEqual('Test Company');
    expect(profiles[0].company_description).toEqual('A test company');
    expect(profiles[0].logo).toEqual('https://example.com/logo.png');
    expect(profiles[0].website).toEqual('https://testcompany.com');
    expect(profiles[0].industry).toEqual('Technology');
    expect(profiles[0].total_campaigns).toEqual(0);
    expect(parseFloat(profiles[0].rating)).toEqual(0);
    expect(profiles[0].created_at).toBeInstanceOf(Date);
    expect(profiles[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error if user does not exist', async () => {
    // Don't create any user
    expect(createBrandProfile(testInput)).rejects.toThrow(/user not found/i);
  });

  it('should throw error if user is not of type brand', async () => {
    // Create an influencer user instead of brand user
    await db.insert(usersTable)
      .values({
        email: 'influencer@test.com',
        password_hash: 'hashed_password',
        user_type: 'influencer'
      })
      .execute();

    expect(createBrandProfile(testInput)).rejects.toThrow(/user must be of type "brand"/i);
  });

  it('should handle optional fields correctly', async () => {
    // Create a brand user first
    await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hashed_password',
        user_type: 'brand'
      })
      .execute();

    const inputWithOptionals: CreateBrandProfileInput = {
      user_id: 1,
      company_name: 'Test Company',
      company_description: undefined,
      logo: undefined,
      website: undefined,
      industry: undefined
    };

    const result = await createBrandProfile(inputWithOptionals);

    expect(result.company_name).toEqual('Test Company');
    expect(result.company_description).toBeNull();
    expect(result.logo).toBeNull();
    expect(result.website).toBeNull();
    expect(result.industry).toBeNull();
  });
});