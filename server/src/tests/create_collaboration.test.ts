import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, brandProfilesTable, influencerProfilesTable, campaignsTable, collaborationsTable } from '../db/schema';
import { type CreateCollaborationInput } from '../schema';
import { createCollaboration } from '../handlers/create_collaboration';
import { eq, and } from 'drizzle-orm';

describe('createCollaboration', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let brandUserId: number;
  let brandProfileId: number;
  let influencerUserId: number;
  let influencerProfileId: number;
  let activeCampaignId: number;
  let inactiveCampaignId: number;

  beforeEach(async () => {
    // Create brand user
    const brandUserResult = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hash123',
        user_type: 'brand'
      })
      .returning()
      .execute();
    brandUserId = brandUserResult[0].id;

    // Create brand profile
    const brandProfileResult = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUserId,
        company_name: 'Test Brand'
      })
      .returning()
      .execute();
    brandProfileId = brandProfileResult[0].id;

    // Create influencer user
    const influencerUserResult = await db.insert(usersTable)
      .values({
        email: 'influencer@test.com',
        password_hash: 'hash456',
        user_type: 'influencer'
      })
      .returning()
      .execute();
    influencerUserId = influencerUserResult[0].id;

    // Create influencer profile
    const influencerProfileResult = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUserId,
        display_name: 'Test Influencer',
        total_reach: 10000,
        engagement_rate: '5.5'
      })
      .returning()
      .execute();
    influencerProfileId = influencerProfileResult[0].id;

    // Create active campaign
    const activeCampaignResult = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfileId,
        title: 'Active Campaign',
        description: 'Test campaign description',
        budget: '5000.00',
        deliverable_requirements: 'Create 3 posts',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: 'active'
      })
      .returning()
      .execute();
    activeCampaignId = activeCampaignResult[0].id;

    // Create inactive campaign
    const inactiveCampaignResult = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfileId,
        title: 'Inactive Campaign',
        description: 'Test campaign description',
        budget: '3000.00',
        deliverable_requirements: 'Create 2 posts',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'draft'
      })
      .returning()
      .execute();
    inactiveCampaignId = inactiveCampaignResult[0].id;
  });

  it('should create a collaboration successfully', async () => {
    const testInput: CreateCollaborationInput = {
      campaign_id: activeCampaignId,
      influencer_id: influencerProfileId,
      agreed_price: 1500.50
    };

    const result = await createCollaboration(testInput);

    // Basic field validation
    expect(result.campaign_id).toEqual(activeCampaignId);
    expect(result.influencer_id).toEqual(influencerProfileId);
    expect(result.agreed_price).toEqual(1500.50);
    expect(typeof result.agreed_price).toEqual('number');
    expect(result.status).toEqual('pending');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save collaboration to database', async () => {
    const testInput: CreateCollaborationInput = {
      campaign_id: activeCampaignId,
      influencer_id: influencerProfileId,
      agreed_price: 2000.75
    };

    const result = await createCollaboration(testInput);

    // Query database to verify collaboration was saved
    const collaborations = await db.select()
      .from(collaborationsTable)
      .where(eq(collaborationsTable.id, result.id))
      .execute();

    expect(collaborations).toHaveLength(1);
    expect(collaborations[0].campaign_id).toEqual(activeCampaignId);
    expect(collaborations[0].influencer_id).toEqual(influencerProfileId);
    expect(parseFloat(collaborations[0].agreed_price)).toEqual(2000.75);
    expect(collaborations[0].status).toEqual('pending');
    expect(collaborations[0].created_at).toBeInstanceOf(Date);
  });

  it('should reject collaboration for non-existent campaign', async () => {
    const testInput: CreateCollaborationInput = {
      campaign_id: 99999, // Non-existent campaign
      influencer_id: influencerProfileId,
      agreed_price: 1000.00
    };

    await expect(createCollaboration(testInput)).rejects.toThrow(/campaign not found/i);
  });

  it('should reject collaboration for inactive campaign', async () => {
    const testInput: CreateCollaborationInput = {
      campaign_id: inactiveCampaignId, // Draft status campaign
      influencer_id: influencerProfileId,
      agreed_price: 1000.00
    };

    await expect(createCollaboration(testInput)).rejects.toThrow(/campaign is not active/i);
  });

  it('should reject collaboration for non-existent influencer', async () => {
    const testInput: CreateCollaborationInput = {
      campaign_id: activeCampaignId,
      influencer_id: 99999, // Non-existent influencer
      agreed_price: 1000.00
    };

    await expect(createCollaboration(testInput)).rejects.toThrow(/influencer profile not found/i);
  });

  it('should reject duplicate collaboration for same campaign-influencer pair', async () => {
    const testInput: CreateCollaborationInput = {
      campaign_id: activeCampaignId,
      influencer_id: influencerProfileId,
      agreed_price: 1500.00
    };

    // Create first collaboration
    await createCollaboration(testInput);

    // Attempt to create duplicate collaboration
    await expect(createCollaboration(testInput)).rejects.toThrow(/collaboration already exists/i);
  });

  it('should handle numeric price conversion correctly', async () => {
    const testInput: CreateCollaborationInput = {
      campaign_id: activeCampaignId,
      influencer_id: influencerProfileId,
      agreed_price: 999.99
    };

    const result = await createCollaboration(testInput);

    // Verify numeric conversion
    expect(typeof result.agreed_price).toEqual('number');
    expect(result.agreed_price).toEqual(999.99);

    // Verify database storage and retrieval
    const dbCollaboration = await db.select()
      .from(collaborationsTable)
      .where(eq(collaborationsTable.id, result.id))
      .execute();

    expect(parseFloat(dbCollaboration[0].agreed_price)).toEqual(999.99);
  });

  it('should allow multiple collaborations for different campaigns with same influencer', async () => {
    // Create second active campaign
    const secondCampaignResult = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfileId,
        title: 'Second Campaign',
        description: 'Another test campaign',
        budget: '4000.00',
        deliverable_requirements: 'Create 2 posts',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active'
      })
      .returning()
      .execute();
    const secondCampaignId = secondCampaignResult[0].id;

    const firstInput: CreateCollaborationInput = {
      campaign_id: activeCampaignId,
      influencer_id: influencerProfileId,
      agreed_price: 1000.00
    };

    const secondInput: CreateCollaborationInput = {
      campaign_id: secondCampaignId,
      influencer_id: influencerProfileId,
      agreed_price: 1200.00
    };

    // Both collaborations should succeed
    const firstResult = await createCollaboration(firstInput);
    const secondResult = await createCollaboration(secondInput);

    expect(firstResult.id).not.toEqual(secondResult.id);
    expect(firstResult.campaign_id).toEqual(activeCampaignId);
    expect(secondResult.campaign_id).toEqual(secondCampaignId);
    expect(firstResult.influencer_id).toEqual(influencerProfileId);
    expect(secondResult.influencer_id).toEqual(influencerProfileId);
  });
});