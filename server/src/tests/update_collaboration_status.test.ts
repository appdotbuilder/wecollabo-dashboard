import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, brandProfilesTable, influencerProfilesTable, campaignsTable, collaborationsTable } from '../db/schema';
import { type UpdateCollaborationStatusInput } from '../schema';
import { updateCollaborationStatus } from '../handlers/update_collaboration_status';
import { eq } from 'drizzle-orm';

describe('updateCollaborationStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  async function createTestData() {
    // Create brand user
    const brandUser = await db.insert(usersTable).values({
      email: 'brand@test.com',
      password_hash: 'hashedpassword',
      user_type: 'brand'
    }).returning().execute();

    // Create influencer user
    const influencerUser = await db.insert(usersTable).values({
      email: 'influencer@test.com',
      password_hash: 'hashedpassword',
      user_type: 'influencer'
    }).returning().execute();

    // Create brand profile
    const brandProfile = await db.insert(brandProfilesTable).values({
      user_id: brandUser[0].id,
      company_name: 'Test Brand'
    }).returning().execute();

    // Create influencer profile
    const influencerProfile = await db.insert(influencerProfilesTable).values({
      user_id: influencerUser[0].id,
      display_name: 'Test Influencer',
      total_reach: 10000,
      engagement_rate: '5.5'
    }).returning().execute();

    // Create campaign
    const campaign = await db.insert(campaignsTable).values({
      brand_id: brandProfile[0].id,
      title: 'Test Campaign',
      description: 'Test campaign description',
      budget: '1000.00',
      deliverable_requirements: 'Create content',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    }).returning().execute();

    // Create collaboration
    const collaboration = await db.insert(collaborationsTable).values({
      campaign_id: campaign[0].id,
      influencer_id: influencerProfile[0].id,
      agreed_price: '500.00'
    }).returning().execute();

    return {
      brandUser: brandUser[0],
      influencerUser: influencerUser[0],
      brandProfile: brandProfile[0],
      influencerProfile: influencerProfile[0],
      campaign: campaign[0],
      collaboration: collaboration[0]
    };
  }

  it('should update collaboration status from pending to accepted', async () => {
    const testData = await createTestData();
    
    const input: UpdateCollaborationStatusInput = {
      id: testData.collaboration.id,
      status: 'accepted'
    };

    const result = await updateCollaborationStatus(input);

    // Verify return value
    expect(result.id).toEqual(testData.collaboration.id);
    expect(result.status).toEqual('accepted');
    expect(result.campaign_id).toEqual(testData.campaign.id);
    expect(result.influencer_id).toEqual(testData.influencerProfile.id);
    expect(result.agreed_price).toEqual(500.00);
    expect(typeof result.agreed_price).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at > testData.collaboration.updated_at).toBe(true);
  });

  it('should update collaboration status from accepted to in_progress', async () => {
    const testData = await createTestData();
    
    // First update to accepted
    await db.update(collaborationsTable)
      .set({ status: 'accepted' })
      .where(eq(collaborationsTable.id, testData.collaboration.id))
      .execute();

    const input: UpdateCollaborationStatusInput = {
      id: testData.collaboration.id,
      status: 'in_progress'
    };

    const result = await updateCollaborationStatus(input);

    expect(result.status).toEqual('in_progress');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update collaboration status from in_progress to completed', async () => {
    const testData = await createTestData();
    
    // First update to in_progress
    await db.update(collaborationsTable)
      .set({ status: 'in_progress' })
      .where(eq(collaborationsTable.id, testData.collaboration.id))
      .execute();

    const input: UpdateCollaborationStatusInput = {
      id: testData.collaboration.id,
      status: 'completed'
    };

    const result = await updateCollaborationStatus(input);

    expect(result.status).toEqual('completed');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update collaboration status from pending to declined', async () => {
    const testData = await createTestData();
    
    const input: UpdateCollaborationStatusInput = {
      id: testData.collaboration.id,
      status: 'declined'
    };

    const result = await updateCollaborationStatus(input);

    expect(result.status).toEqual('declined');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update collaboration status to cancelled from any non-terminal status', async () => {
    const testData = await createTestData();
    
    const input: UpdateCollaborationStatusInput = {
      id: testData.collaboration.id,
      status: 'cancelled'
    };

    const result = await updateCollaborationStatus(input);

    expect(result.status).toEqual('cancelled');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save updated status to database', async () => {
    const testData = await createTestData();
    
    const input: UpdateCollaborationStatusInput = {
      id: testData.collaboration.id,
      status: 'accepted'
    };

    await updateCollaborationStatus(input);

    // Verify database was updated
    const collaborations = await db.select()
      .from(collaborationsTable)
      .where(eq(collaborationsTable.id, testData.collaboration.id))
      .execute();

    expect(collaborations).toHaveLength(1);
    expect(collaborations[0].status).toEqual('accepted');
    expect(collaborations[0].updated_at).toBeInstanceOf(Date);
    expect(collaborations[0].updated_at > testData.collaboration.updated_at).toBe(true);
  });

  it('should throw error for non-existent collaboration', async () => {
    const input: UpdateCollaborationStatusInput = {
      id: 99999,
      status: 'accepted'
    };

    await expect(updateCollaborationStatus(input)).rejects.toThrow(/not found/i);
  });

  it('should throw error for invalid status transition from declined', async () => {
    const testData = await createTestData();
    
    // First update to declined (terminal state)
    await db.update(collaborationsTable)
      .set({ status: 'declined' })
      .where(eq(collaborationsTable.id, testData.collaboration.id))
      .execute();

    const input: UpdateCollaborationStatusInput = {
      id: testData.collaboration.id,
      status: 'accepted'
    };

    await expect(updateCollaborationStatus(input)).rejects.toThrow(/invalid status transition/i);
  });

  it('should throw error for invalid status transition from completed', async () => {
    const testData = await createTestData();
    
    // First update to completed (terminal state)
    await db.update(collaborationsTable)
      .set({ status: 'completed' })
      .where(eq(collaborationsTable.id, testData.collaboration.id))
      .execute();

    const input: UpdateCollaborationStatusInput = {
      id: testData.collaboration.id,
      status: 'in_progress'
    };

    await expect(updateCollaborationStatus(input)).rejects.toThrow(/invalid status transition/i);
  });

  it('should throw error for invalid status transition from cancelled', async () => {
    const testData = await createTestData();
    
    // First update to cancelled (terminal state)
    await db.update(collaborationsTable)
      .set({ status: 'cancelled' })
      .where(eq(collaborationsTable.id, testData.collaboration.id))
      .execute();

    const input: UpdateCollaborationStatusInput = {
      id: testData.collaboration.id,
      status: 'accepted'
    };

    await expect(updateCollaborationStatus(input)).rejects.toThrow(/invalid status transition/i);
  });

  it('should throw error for invalid transition from pending to in_progress', async () => {
    const testData = await createTestData();
    
    const input: UpdateCollaborationStatusInput = {
      id: testData.collaboration.id,
      status: 'in_progress'
    };

    await expect(updateCollaborationStatus(input)).rejects.toThrow(/invalid status transition/i);
  });

  it('should throw error for invalid transition from accepted to completed', async () => {
    const testData = await createTestData();
    
    // First update to accepted
    await db.update(collaborationsTable)
      .set({ status: 'accepted' })
      .where(eq(collaborationsTable.id, testData.collaboration.id))
      .execute();

    const input: UpdateCollaborationStatusInput = {
      id: testData.collaboration.id,
      status: 'completed'
    };

    await expect(updateCollaborationStatus(input)).rejects.toThrow(/invalid status transition/i);
  });
});