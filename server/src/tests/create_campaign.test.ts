import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { campaignsTable, usersTable, brandProfilesTable } from '../db/schema';
import { type CreateCampaignInput } from '../schema';
import { createCampaign } from '../handlers/create_campaign';
import { eq } from 'drizzle-orm';

// Test data setup
const createTestUser = async () => {
  const result = await db.insert(usersTable)
    .values({
      email: 'test@brand.com',
      password_hash: 'hashedpassword',
      user_type: 'brand'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestBrandProfile = async (userId: number) => {
  const result = await db.insert(brandProfilesTable)
    .values({
      user_id: userId,
      company_name: 'Test Brand'
    })
    .returning()
    .execute();
  return result[0];
};

const testInput: CreateCampaignInput = {
  brand_id: 1, // Will be updated in tests
  title: 'Test Campaign',
  description: 'A campaign for testing purposes',
  budget: 5000.00,
  deliverable_requirements: 'Create 3 Instagram posts and 1 story',
  start_date: new Date('2024-02-01'),
  end_date: new Date('2024-02-28')
};

describe('createCampaign', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a campaign with valid brand', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const brand = await createTestBrandProfile(user.id);
    
    const input = { ...testInput, brand_id: brand.id };
    const result = await createCampaign(input);

    // Basic field validation
    expect(result.brand_id).toEqual(brand.id);
    expect(result.title).toEqual('Test Campaign');
    expect(result.description).toEqual(testInput.description);
    expect(result.budget).toEqual(5000.00);
    expect(typeof result.budget).toBe('number'); // Verify numeric conversion
    expect(result.deliverable_requirements).toEqual(testInput.deliverable_requirements);
    expect(result.start_date).toEqual(testInput.start_date);
    expect(result.end_date).toEqual(testInput.end_date);
    expect(result.status).toEqual('draft'); // Default status
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save campaign to database', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const brand = await createTestBrandProfile(user.id);
    
    const input = { ...testInput, brand_id: brand.id };
    const result = await createCampaign(input);

    // Query database to verify persistence
    const campaigns = await db.select()
      .from(campaignsTable)
      .where(eq(campaignsTable.id, result.id))
      .execute();

    expect(campaigns).toHaveLength(1);
    expect(campaigns[0].title).toEqual('Test Campaign');
    expect(campaigns[0].brand_id).toEqual(brand.id);
    expect(parseFloat(campaigns[0].budget)).toEqual(5000.00);
    expect(campaigns[0].status).toEqual('draft');
    expect(campaigns[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when brand does not exist', async () => {
    const input = { ...testInput, brand_id: 999 }; // Non-existent brand ID
    
    await expect(createCampaign(input)).rejects.toThrow(/brand with id 999 not found/i);
  });

  it('should throw error when end date is not after start date', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const brand = await createTestBrandProfile(user.id);
    
    const input = {
      ...testInput,
      brand_id: brand.id,
      start_date: new Date('2024-02-28'),
      end_date: new Date('2024-02-01') // End before start
    };
    
    await expect(createCampaign(input)).rejects.toThrow(/end date must be after start date/i);
  });

  it('should throw error when end date equals start date', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const brand = await createTestBrandProfile(user.id);
    
    const sameDate = new Date('2024-02-15');
    const input = {
      ...testInput,
      brand_id: brand.id,
      start_date: sameDate,
      end_date: sameDate // Same date
    };
    
    await expect(createCampaign(input)).rejects.toThrow(/end date must be after start date/i);
  });

  it('should handle budget with decimal places correctly', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const brand = await createTestBrandProfile(user.id);
    
    const input = {
      ...testInput,
      brand_id: brand.id,
      budget: 1234.56
    };
    const result = await createCampaign(input);

    expect(result.budget).toEqual(1234.56);
    expect(typeof result.budget).toBe('number');

    // Verify in database
    const campaigns = await db.select()
      .from(campaignsTable)
      .where(eq(campaignsTable.id, result.id))
      .execute();

    expect(parseFloat(campaigns[0].budget)).toEqual(1234.56);
  });

  it('should create multiple campaigns for the same brand', async () => {
    // Create prerequisite data
    const user = await createTestUser();
    const brand = await createTestBrandProfile(user.id);
    
    const input1 = { ...testInput, brand_id: brand.id, title: 'Campaign 1' };
    const input2 = { ...testInput, brand_id: brand.id, title: 'Campaign 2' };

    const result1 = await createCampaign(input1);
    const result2 = await createCampaign(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.title).toEqual('Campaign 1');
    expect(result2.title).toEqual('Campaign 2');
    expect(result1.brand_id).toEqual(brand.id);
    expect(result2.brand_id).toEqual(brand.id);

    // Verify both exist in database
    const campaigns = await db.select()
      .from(campaignsTable)
      .where(eq(campaignsTable.brand_id, brand.id))
      .execute();

    expect(campaigns).toHaveLength(2);
  });
});