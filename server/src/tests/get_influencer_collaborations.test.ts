import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  influencerProfilesTable, 
  brandProfilesTable,
  campaignsTable,
  collaborationsTable 
} from '../db/schema';
import { getInfluencerCollaborations } from '../handlers/get_influencer_collaborations';

describe('getInfluencerCollaborations', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when influencer has no collaborations', async () => {
    // Create test influencer user
    const influencerUser = await db.insert(usersTable)
      .values({
        email: 'influencer@test.com',
        password_hash: 'hashed_password',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    // Create influencer profile
    const influencerProfile = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser[0].id,
        display_name: 'Test Influencer',
        bio: 'Test bio',
        total_reach: 10000,
        engagement_rate: '5.50'
      })
      .returning()
      .execute();

    const result = await getInfluencerCollaborations(influencerProfile[0].id);

    expect(result).toEqual([]);
  });

  it('should return collaborations for specific influencer', async () => {
    // Create influencer user and profile
    const influencerUser = await db.insert(usersTable)
      .values({
        email: 'influencer@test.com',
        password_hash: 'hashed_password',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const influencerProfile = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser[0].id,
        display_name: 'Test Influencer',
        bio: 'Test bio',
        total_reach: 10000,
        engagement_rate: '5.50'
      })
      .returning()
      .execute();

    // Create brand user and profile
    const brandUser = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hashed_password',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const brandProfile = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser[0].id,
        company_name: 'Test Brand',
        company_description: 'Test brand description'
      })
      .returning()
      .execute();

    // Create campaign
    const campaign = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfile[0].id,
        title: 'Test Campaign',
        description: 'Test campaign description',
        budget: '1000.00',
        deliverable_requirements: 'Create engaging content',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31')
      })
      .returning()
      .execute();

    // Create collaboration
    const collaboration = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign[0].id,
        influencer_id: influencerProfile[0].id,
        agreed_price: '500.00',
        status: 'accepted'
      })
      .returning()
      .execute();

    const result = await getInfluencerCollaborations(influencerProfile[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(collaboration[0].id);
    expect(result[0].campaign_id).toEqual(campaign[0].id);
    expect(result[0].influencer_id).toEqual(influencerProfile[0].id);
    expect(result[0].agreed_price).toEqual(500.00);
    expect(typeof result[0].agreed_price).toEqual('number');
    expect(result[0].status).toEqual('accepted');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple collaborations for influencer', async () => {
    // Create influencer user and profile
    const influencerUser = await db.insert(usersTable)
      .values({
        email: 'influencer@test.com',
        password_hash: 'hashed_password',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const influencerProfile = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser[0].id,
        display_name: 'Test Influencer',
        bio: 'Test bio',
        total_reach: 10000,
        engagement_rate: '5.50'
      })
      .returning()
      .execute();

    // Create brand user and profile
    const brandUser = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hashed_password',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const brandProfile = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser[0].id,
        company_name: 'Test Brand',
        company_description: 'Test brand description'
      })
      .returning()
      .execute();

    // Create multiple campaigns
    const campaign1 = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfile[0].id,
        title: 'Campaign 1',
        description: 'First campaign',
        budget: '1000.00',
        deliverable_requirements: 'Create engaging content',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31')
      })
      .returning()
      .execute();

    const campaign2 = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfile[0].id,
        title: 'Campaign 2',
        description: 'Second campaign',
        budget: '2000.00',
        deliverable_requirements: 'Create more content',
        start_date: new Date('2024-02-01'),
        end_date: new Date('2024-02-28')
      })
      .returning()
      .execute();

    // Create multiple collaborations
    await db.insert(collaborationsTable)
      .values([
        {
          campaign_id: campaign1[0].id,
          influencer_id: influencerProfile[0].id,
          agreed_price: '500.00',
          status: 'accepted'
        },
        {
          campaign_id: campaign2[0].id,
          influencer_id: influencerProfile[0].id,
          agreed_price: '750.00',
          status: 'in_progress'
        }
      ])
      .execute();

    const result = await getInfluencerCollaborations(influencerProfile[0].id);

    expect(result).toHaveLength(2);
    
    // Check that both collaborations are returned with proper numeric conversion
    const prices = result.map(c => c.agreed_price).sort();
    expect(prices).toEqual([500.00, 750.00]);
    
    // Verify all prices are numbers
    result.forEach(collaboration => {
      expect(typeof collaboration.agreed_price).toEqual('number');
    });

    // Check statuses
    const statuses = result.map(c => c.status).sort();
    expect(statuses).toEqual(['accepted', 'in_progress']);
  });

  it('should not return collaborations for other influencers', async () => {
    // Create two influencer users and profiles
    const influencer1User = await db.insert(usersTable)
      .values({
        email: 'influencer1@test.com',
        password_hash: 'hashed_password',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const influencer1Profile = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencer1User[0].id,
        display_name: 'Influencer 1',
        bio: 'First influencer',
        total_reach: 10000,
        engagement_rate: '5.50'
      })
      .returning()
      .execute();

    const influencer2User = await db.insert(usersTable)
      .values({
        email: 'influencer2@test.com',
        password_hash: 'hashed_password',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const influencer2Profile = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencer2User[0].id,
        display_name: 'Influencer 2',
        bio: 'Second influencer',
        total_reach: 20000,
        engagement_rate: '6.50'
      })
      .returning()
      .execute();

    // Create brand user and profile
    const brandUser = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hashed_password',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const brandProfile = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser[0].id,
        company_name: 'Test Brand',
        company_description: 'Test brand description'
      })
      .returning()
      .execute();

    // Create campaign
    const campaign = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfile[0].id,
        title: 'Test Campaign',
        description: 'Test campaign description',
        budget: '1000.00',
        deliverable_requirements: 'Create engaging content',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31')
      })
      .returning()
      .execute();

    // Create collaborations for both influencers
    await db.insert(collaborationsTable)
      .values([
        {
          campaign_id: campaign[0].id,
          influencer_id: influencer1Profile[0].id,
          agreed_price: '500.00',
          status: 'accepted'
        },
        {
          campaign_id: campaign[0].id,
          influencer_id: influencer2Profile[0].id,
          agreed_price: '600.00',
          status: 'pending'
        }
      ])
      .execute();

    // Query for influencer 1 - should only get their collaboration
    const result1 = await getInfluencerCollaborations(influencer1Profile[0].id);
    expect(result1).toHaveLength(1);
    expect(result1[0].influencer_id).toEqual(influencer1Profile[0].id);
    expect(result1[0].agreed_price).toEqual(500.00);
    expect(result1[0].status).toEqual('accepted');

    // Query for influencer 2 - should only get their collaboration
    const result2 = await getInfluencerCollaborations(influencer2Profile[0].id);
    expect(result2).toHaveLength(1);
    expect(result2[0].influencer_id).toEqual(influencer2Profile[0].id);
    expect(result2[0].agreed_price).toEqual(600.00);
    expect(result2[0].status).toEqual('pending');
  });

  it('should handle non-existent influencer gracefully', async () => {
    const result = await getInfluencerCollaborations(999999);
    expect(result).toEqual([]);
  });
});