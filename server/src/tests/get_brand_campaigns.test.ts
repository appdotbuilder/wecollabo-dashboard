import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, brandProfilesTable, campaignsTable } from '../db/schema';
import { getBrandCampaigns } from '../handlers/get_brand_campaigns';
import { eq } from 'drizzle-orm';

describe('getBrandCampaigns', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return campaigns for a specific brand', async () => {
    // Create test user and brand profile
    const [user] = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [brandProfile] = await db.insert(brandProfilesTable)
      .values({
        user_id: user.id,
        company_name: 'Test Brand',
        company_description: 'A test brand',
        total_campaigns: 0,
        rating: '4.5'
      })
      .returning()
      .execute();

    // Create test campaigns
    const campaign1Data = {
      brand_id: brandProfile.id,
      title: 'Summer Campaign',
      description: 'A summer marketing campaign',
      budget: '5000.00',
      deliverable_requirements: 'Instagram posts and stories',
      start_date: new Date('2024-06-01'),
      end_date: new Date('2024-08-31'),
      status: 'active' as const
    };

    const campaign2Data = {
      brand_id: brandProfile.id,
      title: 'Winter Campaign',
      description: 'A winter marketing campaign',
      budget: '7500.50',
      deliverable_requirements: 'TikTok videos',
      start_date: new Date('2024-12-01'),
      end_date: new Date('2025-02-28'),
      status: 'draft' as const
    };

    await db.insert(campaignsTable)
      .values([campaign1Data, campaign2Data])
      .execute();

    // Fetch campaigns for the brand
    const campaigns = await getBrandCampaigns(brandProfile.id);

    // Verify results
    expect(campaigns).toHaveLength(2);
    
    // Sort by title for consistent testing
    const sortedCampaigns = campaigns.sort((a, b) => a.title.localeCompare(b.title));

    // Verify first campaign
    expect(sortedCampaigns[0].title).toBe('Summer Campaign');
    expect(sortedCampaigns[0].description).toBe('A summer marketing campaign');
    expect(sortedCampaigns[0].budget).toBe(5000.00);
    expect(typeof sortedCampaigns[0].budget).toBe('number');
    expect(sortedCampaigns[0].deliverable_requirements).toBe('Instagram posts and stories');
    expect(sortedCampaigns[0].status).toBe('active');
    expect(sortedCampaigns[0].brand_id).toBe(brandProfile.id);
    expect(sortedCampaigns[0].id).toBeDefined();
    expect(sortedCampaigns[0].created_at).toBeInstanceOf(Date);
    expect(sortedCampaigns[0].updated_at).toBeInstanceOf(Date);
    expect(sortedCampaigns[0].start_date).toBeInstanceOf(Date);
    expect(sortedCampaigns[0].end_date).toBeInstanceOf(Date);

    // Verify second campaign
    expect(sortedCampaigns[1].title).toBe('Winter Campaign');
    expect(sortedCampaigns[1].description).toBe('A winter marketing campaign');
    expect(sortedCampaigns[1].budget).toBe(7500.50);
    expect(typeof sortedCampaigns[1].budget).toBe('number');
    expect(sortedCampaigns[1].deliverable_requirements).toBe('TikTok videos');
    expect(sortedCampaigns[1].status).toBe('draft');
    expect(sortedCampaigns[1].brand_id).toBe(brandProfile.id);
  });

  it('should return empty array for brand with no campaigns', async () => {
    // Create test user and brand profile
    const [user] = await db.insert(usersTable)
      .values({
        email: 'emptybrand@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [brandProfile] = await db.insert(brandProfilesTable)
      .values({
        user_id: user.id,
        company_name: 'Empty Brand',
        company_description: 'A brand with no campaigns',
        total_campaigns: 0,
        rating: '0'
      })
      .returning()
      .execute();

    // Fetch campaigns for the brand
    const campaigns = await getBrandCampaigns(brandProfile.id);

    // Verify empty result
    expect(campaigns).toHaveLength(0);
    expect(campaigns).toEqual([]);
  });

  it('should return empty array for non-existent brand', async () => {
    const nonExistentBrandId = 99999;

    // Fetch campaigns for non-existent brand
    const campaigns = await getBrandCampaigns(nonExistentBrandId);

    // Verify empty result
    expect(campaigns).toHaveLength(0);
    expect(campaigns).toEqual([]);
  });

  it('should not return campaigns from other brands', async () => {
    // Create first brand
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'brand1@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [brandProfile1] = await db.insert(brandProfilesTable)
      .values({
        user_id: user1.id,
        company_name: 'Brand One',
        company_description: 'First test brand',
        total_campaigns: 0,
        rating: '4.0'
      })
      .returning()
      .execute();

    // Create second brand
    const [user2] = await db.insert(usersTable)
      .values({
        email: 'brand2@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [brandProfile2] = await db.insert(brandProfilesTable)
      .values({
        user_id: user2.id,
        company_name: 'Brand Two',
        company_description: 'Second test brand',
        total_campaigns: 0,
        rating: '3.5'
      })
      .returning()
      .execute();

    // Create campaigns for both brands
    await db.insert(campaignsTable)
      .values([
        {
          brand_id: brandProfile1.id,
          title: 'Brand One Campaign',
          description: 'Campaign for brand one',
          budget: '1000.00',
          deliverable_requirements: 'Social media posts',
          start_date: new Date('2024-01-01'),
          end_date: new Date('2024-01-31'),
          status: 'active'
        },
        {
          brand_id: brandProfile2.id,
          title: 'Brand Two Campaign',
          description: 'Campaign for brand two',
          budget: '2000.00',
          deliverable_requirements: 'Video content',
          start_date: new Date('2024-02-01'),
          end_date: new Date('2024-02-28'),
          status: 'active'
        }
      ])
      .execute();

    // Fetch campaigns for brand one only
    const brand1Campaigns = await getBrandCampaigns(brandProfile1.id);

    // Verify only brand one's campaigns are returned
    expect(brand1Campaigns).toHaveLength(1);
    expect(brand1Campaigns[0].title).toBe('Brand One Campaign');
    expect(brand1Campaigns[0].brand_id).toBe(brandProfile1.id);
    expect(brand1Campaigns[0].budget).toBe(1000.00);
    expect(typeof brand1Campaigns[0].budget).toBe('number');

    // Fetch campaigns for brand two only
    const brand2Campaigns = await getBrandCampaigns(brandProfile2.id);

    // Verify only brand two's campaigns are returned
    expect(brand2Campaigns).toHaveLength(1);
    expect(brand2Campaigns[0].title).toBe('Brand Two Campaign');
    expect(brand2Campaigns[0].brand_id).toBe(brandProfile2.id);
    expect(brand2Campaigns[0].budget).toBe(2000.00);
    expect(typeof brand2Campaigns[0].budget).toBe('number');
  });

  it('should handle various campaign statuses correctly', async () => {
    // Create test user and brand profile
    const [user] = await db.insert(usersTable)
      .values({
        email: 'statusbrand@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [brandProfile] = await db.insert(brandProfilesTable)
      .values({
        user_id: user.id,
        company_name: 'Status Test Brand',
        company_description: 'Testing various campaign statuses',
        total_campaigns: 0,
        rating: '4.2'
      })
      .returning()
      .execute();

    // Create campaigns with different statuses
    const campaignStatuses = ['draft', 'active', 'paused', 'completed', 'cancelled'] as const;
    
    for (let i = 0; i < campaignStatuses.length; i++) {
      await db.insert(campaignsTable)
        .values({
          brand_id: brandProfile.id,
          title: `Campaign ${campaignStatuses[i]}`,
          description: `A ${campaignStatuses[i]} campaign`,
          budget: `${(i + 1) * 1000}.00`,
          deliverable_requirements: 'Various requirements',
          start_date: new Date(`2024-0${i + 1}-01`),
          end_date: new Date(`2024-0${i + 1}-31`),
          status: campaignStatuses[i]
        })
        .execute();
    }

    // Fetch all campaigns
    const campaigns = await getBrandCampaigns(brandProfile.id);

    // Verify all campaigns are returned with correct statuses
    expect(campaigns).toHaveLength(5);
    
    const statusCounts = campaigns.reduce((acc, campaign) => {
      acc[campaign.status] = (acc[campaign.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    expect(statusCounts['draft']).toBe(1);
    expect(statusCounts['active']).toBe(1);
    expect(statusCounts['paused']).toBe(1);
    expect(statusCounts['completed']).toBe(1);
    expect(statusCounts['cancelled']).toBe(1);

    // Verify all campaigns have correct data types
    campaigns.forEach(campaign => {
      expect(typeof campaign.budget).toBe('number');
      expect(campaign.start_date).toBeInstanceOf(Date);
      expect(campaign.end_date).toBeInstanceOf(Date);
      expect(campaign.created_at).toBeInstanceOf(Date);
      expect(campaign.updated_at).toBeInstanceOf(Date);
    });
  });
});