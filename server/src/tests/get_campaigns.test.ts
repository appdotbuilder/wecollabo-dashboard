import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, brandProfilesTable, campaignsTable } from '../db/schema';
import { getCampaigns } from '../handlers/get_campaigns';
import { eq } from 'drizzle-orm';

describe('getCampaigns', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no active campaigns exist', async () => {
    const result = await getCampaigns();
    
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });

  it('should return only active campaigns', async () => {
    // Create test user
    const userResult = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hashed_password',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create brand profile
    const brandResult = await db.insert(brandProfilesTable)
      .values({
        user_id: userResult[0].id,
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    // Create campaigns with different statuses
    await db.insert(campaignsTable)
      .values([
        {
          brand_id: brandResult[0].id,
          title: 'Active Campaign 1',
          description: 'First active campaign',
          budget: '1000.00',
          deliverable_requirements: 'Create content',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-12-31'),
          status: 'active'
        },
        {
          brand_id: brandResult[0].id,
          title: 'Draft Campaign',
          description: 'Draft campaign',
          budget: '500.00',
          deliverable_requirements: 'Create content',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-12-31'),
          status: 'draft'
        },
        {
          brand_id: brandResult[0].id,
          title: 'Active Campaign 2',
          description: 'Second active campaign',
          budget: '2000.50',
          deliverable_requirements: 'Create video content',
          start_date: new Date('2024-02-01'),
          end_date: new Date('2024-11-30'),
          status: 'active'
        },
        {
          brand_id: brandResult[0].id,
          title: 'Completed Campaign',
          description: 'Completed campaign',
          budget: '1500.00',
          deliverable_requirements: 'Create content',
          start_date: new Date('2023-01-01'),
          end_date: new Date('2023-12-31'),
          status: 'completed'
        }
      ])
      .execute();

    const result = await getCampaigns();

    expect(result).toHaveLength(2);
    
    // Verify only active campaigns are returned
    result.forEach(campaign => {
      expect(campaign.status).toEqual('active');
    });

    // Verify campaign data structure and types
    const firstCampaign = result.find(c => c.title === 'Active Campaign 1');
    expect(firstCampaign).toBeDefined();
    expect(firstCampaign!.id).toBeDefined();
    expect(firstCampaign!.brand_id).toEqual(brandResult[0].id);
    expect(firstCampaign!.title).toEqual('Active Campaign 1');
    expect(firstCampaign!.description).toEqual('First active campaign');
    expect(firstCampaign!.budget).toEqual(1000);
    expect(typeof firstCampaign!.budget).toEqual('number');
    expect(firstCampaign!.deliverable_requirements).toEqual('Create content');
    expect(firstCampaign!.start_date).toBeInstanceOf(Date);
    expect(firstCampaign!.end_date).toBeInstanceOf(Date);
    expect(firstCampaign!.status).toEqual('active');
    expect(firstCampaign!.created_at).toBeInstanceOf(Date);
    expect(firstCampaign!.updated_at).toBeInstanceOf(Date);

    const secondCampaign = result.find(c => c.title === 'Active Campaign 2');
    expect(secondCampaign).toBeDefined();
    expect(secondCampaign!.budget).toEqual(2000.5);
    expect(typeof secondCampaign!.budget).toEqual('number');
  });

  it('should verify active campaigns are saved correctly in database', async () => {
    // Create test user and brand profile
    const userResult = await db.insert(usersTable)
      .values({
        email: 'brand2@test.com',
        password_hash: 'hashed_password',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const brandResult = await db.insert(brandProfilesTable)
      .values({
        user_id: userResult[0].id,
        company_name: 'Test Company 2'
      })
      .returning()
      .execute();

    // Create an active campaign
    await db.insert(campaignsTable)
      .values({
        brand_id: brandResult[0].id,
        title: 'Database Test Campaign',
        description: 'Testing database storage',
        budget: '999.99',
        deliverable_requirements: 'Test requirements',
        start_date: new Date('2024-03-01'),
        end_date: new Date('2024-09-30'),
        status: 'active'
      })
      .execute();

    const result = await getCampaigns();
    expect(result).toHaveLength(1);

    // Verify the campaign exists in the database with correct status
    const dbCampaigns = await db.select()
      .from(campaignsTable)
      .where(eq(campaignsTable.status, 'active'))
      .execute();

    expect(dbCampaigns).toHaveLength(1);
    expect(dbCampaigns[0].title).toEqual('Database Test Campaign');
    expect(parseFloat(dbCampaigns[0].budget)).toEqual(999.99);
  });

  it('should handle multiple active campaigns from different brands', async () => {
    // Create first user and brand
    const user1Result = await db.insert(usersTable)
      .values({
        email: 'brand1@test.com',
        password_hash: 'hashed_password',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const brand1Result = await db.insert(brandProfilesTable)
      .values({
        user_id: user1Result[0].id,
        company_name: 'Brand One'
      })
      .returning()
      .execute();

    // Create second user and brand
    const user2Result = await db.insert(usersTable)
      .values({
        email: 'brand2@test.com',
        password_hash: 'hashed_password',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const brand2Result = await db.insert(brandProfilesTable)
      .values({
        user_id: user2Result[0].id,
        company_name: 'Brand Two'
      })
      .returning()
      .execute();

    // Create active campaigns for both brands
    await db.insert(campaignsTable)
      .values([
        {
          brand_id: brand1Result[0].id,
          title: 'Brand One Campaign',
          description: 'Campaign from first brand',
          budget: '1200.00',
          deliverable_requirements: 'Content for brand one',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-12-31'),
          status: 'active'
        },
        {
          brand_id: brand2Result[0].id,
          title: 'Brand Two Campaign',
          description: 'Campaign from second brand',
          budget: '800.75',
          deliverable_requirements: 'Content for brand two',
          start_date: new Date('2024-02-01'),
          end_date: new Date('2024-11-30'),
          status: 'active'
        }
      ])
      .execute();

    const result = await getCampaigns();

    expect(result).toHaveLength(2);
    
    // Verify both brands' campaigns are returned
    const brand1Campaign = result.find(c => c.brand_id === brand1Result[0].id);
    const brand2Campaign = result.find(c => c.brand_id === brand2Result[0].id);

    expect(brand1Campaign).toBeDefined();
    expect(brand1Campaign!.title).toEqual('Brand One Campaign');
    expect(brand1Campaign!.budget).toEqual(1200);

    expect(brand2Campaign).toBeDefined();
    expect(brand2Campaign!.title).toEqual('Brand Two Campaign');
    expect(brand2Campaign!.budget).toEqual(800.75);
  });

  it('should handle decimal budget values correctly', async () => {
    // Create test user and brand
    const userResult = await db.insert(usersTable)
      .values({
        email: 'decimal@test.com',
        password_hash: 'hashed_password',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const brandResult = await db.insert(brandProfilesTable)
      .values({
        user_id: userResult[0].id,
        company_name: 'Decimal Test Brand'
      })
      .returning()
      .execute();

    // Create campaign with precise decimal budget
    await db.insert(campaignsTable)
      .values({
        brand_id: brandResult[0].id,
        title: 'Decimal Budget Campaign',
        description: 'Testing decimal precision',
        budget: '1234.56',
        deliverable_requirements: 'Precise budget test',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        status: 'active'
      })
      .execute();

    const result = await getCampaigns();

    expect(result).toHaveLength(1);
    expect(result[0].budget).toEqual(1234.56);
    expect(typeof result[0].budget).toEqual('number');
  });
});