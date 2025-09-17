import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  influencerProfilesTable, 
  brandProfilesTable, 
  campaignsTable,
  collaborationsTable,
  disputesTable 
} from '../db/schema';
import { type CreateDisputeInput } from '../schema';
import { createDispute } from '../handlers/create_dispute';
import { eq } from 'drizzle-orm';

describe('createDispute', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Test setup data - we'll create users, profiles, campaign, and collaboration
  let brandUserId: number;
  let influencerUserId: number;
  let brandProfileId: number;
  let influencerProfileId: number;
  let campaignId: number;
  let collaborationId: number;

  const setupTestData = async () => {
    // Create brand user
    const brandUserResult = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();
    brandUserId = brandUserResult[0].id;

    // Create influencer user
    const influencerUserResult = await db.insert(usersTable)
      .values({
        email: 'influencer@test.com',
        password_hash: 'hashedpassword',
        user_type: 'influencer'
      })
      .returning()
      .execute();
    influencerUserId = influencerUserResult[0].id;

    // Create brand profile
    const brandProfileResult = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUserId,
        company_name: 'Test Brand Co.'
      })
      .returning()
      .execute();
    brandProfileId = brandProfileResult[0].id;

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

    // Create campaign
    const campaignResult = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfileId,
        title: 'Test Campaign',
        description: 'A campaign for testing',
        budget: '1000.00',
        deliverable_requirements: 'Create content',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31')
      })
      .returning()
      .execute();
    campaignId = campaignResult[0].id;

    // Create collaboration
    const collaborationResult = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaignId,
        influencer_id: influencerProfileId,
        agreed_price: '500.00'
      })
      .returning()
      .execute();
    collaborationId = collaborationResult[0].id;
  };

  const testInput: CreateDisputeInput = {
    collaboration_id: 0, // Will be set in tests
    initiated_by: 0, // Will be set in tests
    subject: 'Payment Issue',
    description: 'The agreed payment has not been processed according to the terms.'
  };

  it('should create a dispute when initiated by brand user', async () => {
    await setupTestData();

    const input = {
      ...testInput,
      collaboration_id: collaborationId,
      initiated_by: brandUserId
    };

    const result = await createDispute(input);

    // Verify basic dispute properties
    expect(result.collaboration_id).toEqual(collaborationId);
    expect(result.initiated_by).toEqual(brandUserId);
    expect(result.subject).toEqual('Payment Issue');
    expect(result.description).toEqual(testInput.description);
    expect(result.status).toEqual('open');
    expect(result.resolution).toBeNull();
    expect(result.resolved_at).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a dispute when initiated by influencer user', async () => {
    await setupTestData();

    const input = {
      ...testInput,
      collaboration_id: collaborationId,
      initiated_by: influencerUserId,
      subject: 'Deliverable Rejection',
      description: 'The deliverable was rejected without valid feedback.'
    };

    const result = await createDispute(input);

    // Verify basic dispute properties
    expect(result.collaboration_id).toEqual(collaborationId);
    expect(result.initiated_by).toEqual(influencerUserId);
    expect(result.subject).toEqual('Deliverable Rejection');
    expect(result.description).toEqual(input.description);
    expect(result.status).toEqual('open');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save dispute to database', async () => {
    await setupTestData();

    const input = {
      ...testInput,
      collaboration_id: collaborationId,
      initiated_by: brandUserId
    };

    const result = await createDispute(input);

    // Verify the dispute was saved to database
    const disputes = await db.select()
      .from(disputesTable)
      .where(eq(disputesTable.id, result.id))
      .execute();

    expect(disputes).toHaveLength(1);
    expect(disputes[0].collaboration_id).toEqual(collaborationId);
    expect(disputes[0].initiated_by).toEqual(brandUserId);
    expect(disputes[0].subject).toEqual('Payment Issue');
    expect(disputes[0].description).toEqual(testInput.description);
    expect(disputes[0].status).toEqual('open');
    expect(disputes[0].resolution).toBeNull();
    expect(disputes[0].resolved_at).toBeNull();
    expect(disputes[0].created_at).toBeInstanceOf(Date);
    expect(disputes[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent collaboration', async () => {
    await setupTestData();

    const input = {
      ...testInput,
      collaboration_id: 99999, // Non-existent ID
      initiated_by: brandUserId
    };

    await expect(createDispute(input)).rejects.toThrow(/collaboration not found/i);
  });

  it('should throw error when user is not authorized', async () => {
    await setupTestData();

    // Create unauthorized user
    const unauthorizedUserResult = await db.insert(usersTable)
      .values({
        email: 'unauthorized@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      collaboration_id: collaborationId,
      initiated_by: unauthorizedUserResult[0].id
    };

    await expect(createDispute(input)).rejects.toThrow(/not authorized/i);
  });

  it('should handle multiple disputes for same collaboration', async () => {
    await setupTestData();

    // Create first dispute from brand
    const firstInput = {
      ...testInput,
      collaboration_id: collaborationId,
      initiated_by: brandUserId,
      subject: 'First Issue'
    };

    const firstResult = await createDispute(firstInput);

    // Create second dispute from influencer
    const secondInput = {
      ...testInput,
      collaboration_id: collaborationId,
      initiated_by: influencerUserId,
      subject: 'Second Issue',
      description: 'Different problem with same collaboration'
    };

    const secondResult = await createDispute(secondInput);

    // Verify both disputes exist and are different
    expect(firstResult.id).not.toEqual(secondResult.id);
    expect(firstResult.subject).toEqual('First Issue');
    expect(secondResult.subject).toEqual('Second Issue');
    expect(firstResult.initiated_by).toEqual(brandUserId);
    expect(secondResult.initiated_by).toEqual(influencerUserId);

    // Verify both are in database
    const disputes = await db.select()
      .from(disputesTable)
      .where(eq(disputesTable.collaboration_id, collaborationId))
      .execute();

    expect(disputes).toHaveLength(2);
  });

  it('should create dispute with complete field validation', async () => {
    await setupTestData();

    const input = {
      collaboration_id: collaborationId,
      initiated_by: influencerUserId,
      subject: 'Complex Dispute Subject with Special Characters!@#',
      description: 'This is a detailed description of the dispute that includes multiple lines\nand various characters to test field handling.'
    };

    const result = await createDispute(input);

    // Comprehensive field validation
    expect(typeof result.id).toBe('number');
    expect(result.id).toBeGreaterThan(0);
    expect(result.collaboration_id).toBe(collaborationId);
    expect(result.initiated_by).toBe(influencerUserId);
    expect(result.subject).toBe(input.subject);
    expect(result.description).toBe(input.description);
    expect(result.status).toBe('open');
    expect(result.resolution).toBeNull();
    expect(result.resolved_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify timestamps are recent
    const now = new Date();
    const timeDiff = now.getTime() - result.created_at.getTime();
    expect(timeDiff).toBeLessThan(5000); // Created within last 5 seconds
  });
});