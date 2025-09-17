import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  brandProfilesTable, 
  influencerProfilesTable, 
  campaignsTable, 
  collaborationsTable, 
  deliverablesTable 
} from '../db/schema';
import { type UpdateDeliverableStatusInput } from '../schema';
import { updateDeliverableStatus } from '../handlers/update_deliverable_status';
import { eq } from 'drizzle-orm';

describe('updateDeliverableStatus', () => {
  let testDeliverableId: number;
  let testCollaborationId: number;

  beforeEach(async () => {
    await createDB();

    // Create prerequisite data
    // 1. Create users
    const brandUser = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hash123',
        user_type: 'brand',
        is_verified: true
      })
      .returning()
      .execute();

    const influencerUser = await db.insert(usersTable)
      .values({
        email: 'influencer@test.com',
        password_hash: 'hash123',
        user_type: 'influencer',
        is_verified: true
      })
      .returning()
      .execute();

    // 2. Create brand profile
    const brandProfile = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser[0].id,
        company_name: 'Test Brand',
        company_description: 'A test brand',
        total_campaigns: 0,
        rating: '4.5'
      })
      .returning()
      .execute();

    // 3. Create influencer profile
    const influencerProfile = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser[0].id,
        display_name: 'Test Influencer',
        bio: 'A test influencer',
        total_reach: 10000,
        engagement_rate: '5.5',
        total_collaborations: 5,
        rating: '4.8',
        total_earnings: '1500.00'
      })
      .returning()
      .execute();

    // 4. Create campaign
    const campaign = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfile[0].id,
        title: 'Test Campaign',
        description: 'A test campaign',
        budget: '1000.00',
        deliverable_requirements: 'Create engaging content',
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        status: 'active'
      })
      .returning()
      .execute();

    // 5. Create collaboration
    const collaboration = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign[0].id,
        influencer_id: influencerProfile[0].id,
        agreed_price: '500.00',
        status: 'accepted'
      })
      .returning()
      .execute();

    testCollaborationId = collaboration[0].id;

    // 6. Create deliverable
    const deliverable = await db.insert(deliverablesTable)
      .values({
        collaboration_id: testCollaborationId,
        title: 'Test Deliverable',
        description: 'A test deliverable',
        file_url: null,
        status: 'pending',
        feedback: null,
        submitted_at: null
      })
      .returning()
      .execute();

    testDeliverableId = deliverable[0].id;
  });

  afterEach(resetDB);

  it('should update deliverable status to submitted', async () => {
    const input: UpdateDeliverableStatusInput = {
      id: testDeliverableId,
      status: 'submitted'
    };

    const result = await updateDeliverableStatus(input);

    // Verify returned data
    expect(result.id).toEqual(testDeliverableId);
    expect(result.collaboration_id).toEqual(testCollaborationId);
    expect(result.title).toEqual('Test Deliverable');
    expect(result.status).toEqual('submitted');
    expect(result.submitted_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update deliverable status with feedback', async () => {
    const input: UpdateDeliverableStatusInput = {
      id: testDeliverableId,
      status: 'revision_requested',
      feedback: 'Please make some changes'
    };

    const result = await updateDeliverableStatus(input);

    // Verify returned data
    expect(result.status).toEqual('revision_requested');
    expect(result.feedback).toEqual('Please make some changes');
    expect(result.submitted_at).toBeNull();
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should approve deliverable without feedback', async () => {
    const input: UpdateDeliverableStatusInput = {
      id: testDeliverableId,
      status: 'approved'
    };

    const result = await updateDeliverableStatus(input);

    // Verify returned data
    expect(result.status).toEqual('approved');
    expect(result.feedback).toBeNull();
    expect(result.submitted_at).toBeNull();
  });

  it('should save changes to database', async () => {
    const input: UpdateDeliverableStatusInput = {
      id: testDeliverableId,
      status: 'submitted',
      feedback: 'Submitted for review'
    };

    await updateDeliverableStatus(input);

    // Query database directly to verify changes
    const deliverables = await db.select()
      .from(deliverablesTable)
      .where(eq(deliverablesTable.id, testDeliverableId))
      .execute();

    expect(deliverables).toHaveLength(1);
    expect(deliverables[0].status).toEqual('submitted');
    expect(deliverables[0].feedback).toEqual('Submitted for review');
    expect(deliverables[0].submitted_at).toBeInstanceOf(Date);
    expect(deliverables[0].updated_at).toBeInstanceOf(Date);
  });

  it('should reject deliverable with feedback', async () => {
    const input: UpdateDeliverableStatusInput = {
      id: testDeliverableId,
      status: 'rejected',
      feedback: 'Does not meet requirements'
    };

    const result = await updateDeliverableStatus(input);

    // Verify returned data
    expect(result.status).toEqual('rejected');
    expect(result.feedback).toEqual('Does not meet requirements');
    expect(result.submitted_at).toBeNull();
  });

  it('should throw error for non-existent deliverable', async () => {
    const input: UpdateDeliverableStatusInput = {
      id: 99999,
      status: 'approved'
    };

    expect(updateDeliverableStatus(input)).rejects.toThrow(/not found/i);
  });

  it('should handle null feedback correctly', async () => {
    const input: UpdateDeliverableStatusInput = {
      id: testDeliverableId,
      status: 'approved',
      feedback: null
    };

    const result = await updateDeliverableStatus(input);

    expect(result.status).toEqual('approved');
    expect(result.feedback).toBeNull();
  });
});