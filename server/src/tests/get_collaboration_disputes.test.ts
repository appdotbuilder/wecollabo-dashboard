import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  brandProfilesTable, 
  influencerProfilesTable, 
  campaignsTable, 
  collaborationsTable, 
  disputesTable 
} from '../db/schema';
import { getCollaborationDisputes } from '../handlers/get_collaboration_disputes';

describe('getCollaborationDisputes', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no disputes exist for collaboration', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [brandProfile] = await db.insert(brandProfilesTable)
      .values({
        user_id: user.id,
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    const [influencerUser] = await db.insert(usersTable)
      .values({
        email: 'influencer@example.com',
        password_hash: 'hashed',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const [influencerProfile] = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser.id,
        display_name: 'Test Influencer',
        total_reach: 1000,
        engagement_rate: '5.0'
      })
      .returning()
      .execute();

    const [campaign] = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfile.id,
        title: 'Test Campaign',
        description: 'A test campaign',
        budget: '1000.00',
        deliverable_requirements: 'Test requirements',
        start_date: new Date(),
        end_date: new Date()
      })
      .returning()
      .execute();

    const [collaboration] = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign.id,
        influencer_id: influencerProfile.id,
        agreed_price: '500.00'
      })
      .returning()
      .execute();

    const result = await getCollaborationDisputes(collaboration.id);

    expect(result).toEqual([]);
  });

  it('should return disputes for specific collaboration', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [brandProfile] = await db.insert(brandProfilesTable)
      .values({
        user_id: user.id,
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    const [influencerUser] = await db.insert(usersTable)
      .values({
        email: 'influencer@example.com',
        password_hash: 'hashed',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const [influencerProfile] = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser.id,
        display_name: 'Test Influencer',
        total_reach: 1000,
        engagement_rate: '5.0'
      })
      .returning()
      .execute();

    const [campaign] = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfile.id,
        title: 'Test Campaign',
        description: 'A test campaign',
        budget: '1000.00',
        deliverable_requirements: 'Test requirements',
        start_date: new Date(),
        end_date: new Date()
      })
      .returning()
      .execute();

    const [collaboration] = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign.id,
        influencer_id: influencerProfile.id,
        agreed_price: '500.00'
      })
      .returning()
      .execute();

    // Create disputes
    await db.insert(disputesTable)
      .values({
        collaboration_id: collaboration.id,
        initiated_by: user.id,
        subject: 'Payment Issue',
        description: 'Payment was not processed correctly'
      })
      .execute();

    await db.insert(disputesTable)
      .values({
        collaboration_id: collaboration.id,
        initiated_by: influencerUser.id,
        subject: 'Quality Concerns',
        description: 'The deliverable requirements were unclear'
      })
      .execute();

    const result = await getCollaborationDisputes(collaboration.id);

    expect(result).toHaveLength(2);
    
    // Check first dispute
    expect(result[0].collaboration_id).toEqual(collaboration.id);
    expect(result[0].subject).toEqual('Payment Issue');
    expect(result[0].description).toEqual('Payment was not processed correctly');
    expect(result[0].status).toEqual('open'); // Default status
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);

    // Check second dispute
    expect(result[1].collaboration_id).toEqual(collaboration.id);
    expect(result[1].subject).toEqual('Quality Concerns');
    expect(result[1].description).toEqual('The deliverable requirements were unclear');
    expect(result[1].status).toEqual('open'); // Default status
    expect(result[1].id).toBeDefined();
    expect(result[1].created_at).toBeInstanceOf(Date);
    expect(result[1].updated_at).toBeInstanceOf(Date);
  });

  it('should not return disputes from other collaborations', async () => {
    // Create prerequisite data for first collaboration
    const [user1] = await db.insert(usersTable)
      .values({
        email: 'user1@example.com',
        password_hash: 'hashed',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [brandProfile1] = await db.insert(brandProfilesTable)
      .values({
        user_id: user1.id,
        company_name: 'Test Company 1'
      })
      .returning()
      .execute();

    const [influencerUser] = await db.insert(usersTable)
      .values({
        email: 'influencer@example.com',
        password_hash: 'hashed',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const [influencerProfile] = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser.id,
        display_name: 'Test Influencer',
        total_reach: 1000,
        engagement_rate: '5.0'
      })
      .returning()
      .execute();

    const [campaign1] = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfile1.id,
        title: 'Test Campaign 1',
        description: 'A test campaign',
        budget: '1000.00',
        deliverable_requirements: 'Test requirements',
        start_date: new Date(),
        end_date: new Date()
      })
      .returning()
      .execute();

    const [collaboration1] = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign1.id,
        influencer_id: influencerProfile.id,
        agreed_price: '500.00'
      })
      .returning()
      .execute();

    // Create second collaboration
    const [user2] = await db.insert(usersTable)
      .values({
        email: 'user2@example.com',
        password_hash: 'hashed',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [brandProfile2] = await db.insert(brandProfilesTable)
      .values({
        user_id: user2.id,
        company_name: 'Test Company 2'
      })
      .returning()
      .execute();

    const [campaign2] = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfile2.id,
        title: 'Test Campaign 2',
        description: 'Another test campaign',
        budget: '2000.00',
        deliverable_requirements: 'Other requirements',
        start_date: new Date(),
        end_date: new Date()
      })
      .returning()
      .execute();

    const [collaboration2] = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign2.id,
        influencer_id: influencerProfile.id,
        agreed_price: '750.00'
      })
      .returning()
      .execute();

    // Create disputes for both collaborations
    await db.insert(disputesTable)
      .values({
        collaboration_id: collaboration1.id,
        initiated_by: user1.id,
        subject: 'Collaboration 1 Issue',
        description: 'Issue with collaboration 1'
      })
      .execute();

    await db.insert(disputesTable)
      .values({
        collaboration_id: collaboration2.id,
        initiated_by: user2.id,
        subject: 'Collaboration 2 Issue',
        description: 'Issue with collaboration 2'
      })
      .execute();

    const result1 = await getCollaborationDisputes(collaboration1.id);
    const result2 = await getCollaborationDisputes(collaboration2.id);

    expect(result1).toHaveLength(1);
    expect(result1[0].subject).toEqual('Collaboration 1 Issue');
    expect(result1[0].collaboration_id).toEqual(collaboration1.id);

    expect(result2).toHaveLength(1);
    expect(result2[0].subject).toEqual('Collaboration 2 Issue');
    expect(result2[0].collaboration_id).toEqual(collaboration2.id);
  });

  it('should return disputes with all status types', async () => {
    // Create prerequisite data
    const [user] = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [brandProfile] = await db.insert(brandProfilesTable)
      .values({
        user_id: user.id,
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    const [influencerUser] = await db.insert(usersTable)
      .values({
        email: 'influencer@example.com',
        password_hash: 'hashed',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const [influencerProfile] = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser.id,
        display_name: 'Test Influencer',
        total_reach: 1000,
        engagement_rate: '5.0'
      })
      .returning()
      .execute();

    const [campaign] = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfile.id,
        title: 'Test Campaign',
        description: 'A test campaign',
        budget: '1000.00',
        deliverable_requirements: 'Test requirements',
        start_date: new Date(),
        end_date: new Date()
      })
      .returning()
      .execute();

    const [collaboration] = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign.id,
        influencer_id: influencerProfile.id,
        agreed_price: '500.00'
      })
      .returning()
      .execute();

    // Create disputes with different statuses
    await db.insert(disputesTable)
      .values([
        {
          collaboration_id: collaboration.id,
          initiated_by: user.id,
          subject: 'Open Dispute',
          description: 'This dispute is open',
          status: 'open'
        },
        {
          collaboration_id: collaboration.id,
          initiated_by: influencerUser.id,
          subject: 'Resolved Dispute',
          description: 'This dispute is resolved',
          status: 'resolved',
          resolution: 'Issue was resolved through negotiation',
          resolved_at: new Date()
        }
      ])
      .execute();

    const result = await getCollaborationDisputes(collaboration.id);

    expect(result).toHaveLength(2);
    
    // Find disputes by status
    const openDispute = result.find(d => d.status === 'open');
    const resolvedDispute = result.find(d => d.status === 'resolved');

    expect(openDispute).toBeDefined();
    expect(openDispute!.subject).toEqual('Open Dispute');
    expect(openDispute!.resolution).toBeNull();
    expect(openDispute!.resolved_at).toBeNull();

    expect(resolvedDispute).toBeDefined();
    expect(resolvedDispute!.subject).toEqual('Resolved Dispute');
    expect(resolvedDispute!.resolution).toEqual('Issue was resolved through negotiation');
    expect(resolvedDispute!.resolved_at).toBeInstanceOf(Date);
  });

  it('should handle non-existent collaboration id gracefully', async () => {
    const nonExistentId = 99999;
    const result = await getCollaborationDisputes(nonExistentId);

    expect(result).toEqual([]);
  });
});