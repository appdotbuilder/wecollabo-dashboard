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
import { type CreateUserInput, type CreateBrandProfileInput, type CreateInfluencerProfileInput, type CreateCampaignInput, type CreateCollaborationInput, type CreateDeliverableInput } from '../schema';
import { getCollaborationDeliverables } from '../handlers/get_collaboration_deliverables';

describe('getCollaborationDeliverables', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return deliverables for a specific collaboration ordered by creation date', async () => {
    // Create test user for brand
    const brandUserInput: CreateUserInput = {
      email: 'brand@test.com',
      password_hash: 'hashed_password',
      user_type: 'brand'
    };

    const brandUserResult = await db.insert(usersTable)
      .values(brandUserInput)
      .returning()
      .execute();
    const brandUser = brandUserResult[0];

    // Create brand profile
    const brandProfileInput: CreateBrandProfileInput = {
      user_id: brandUser.id,
      company_name: 'Test Brand Company',
      company_description: 'A test brand for testing purposes',
      industry: 'Technology'
    };

    const brandProfileResult = await db.insert(brandProfilesTable)
      .values(brandProfileInput)
      .returning()
      .execute();
    const brandProfile = brandProfileResult[0];

    // Create test user for influencer
    const influencerUserInput: CreateUserInput = {
      email: 'influencer@test.com',
      password_hash: 'hashed_password',
      user_type: 'influencer'
    };

    const influencerUserResult = await db.insert(usersTable)
      .values(influencerUserInput)
      .returning()
      .execute();
    const influencerUser = influencerUserResult[0];

    // Create influencer profile
    const influencerProfileInput: CreateInfluencerProfileInput = {
      user_id: influencerUser.id,
      display_name: 'Test Influencer',
      bio: 'A test influencer',
      total_reach: 50000,
      engagement_rate: 5.5
    };

    const influencerProfileResult = await db.insert(influencerProfilesTable)
      .values({
        ...influencerProfileInput,
        engagement_rate: influencerProfileInput.engagement_rate.toString()
      })
      .returning()
      .execute();
    const influencerProfile = influencerProfileResult[0];

    // Create campaign
    const campaignInput: CreateCampaignInput = {
      brand_id: brandProfile.id,
      title: 'Test Campaign',
      description: 'A test campaign for testing purposes',
      budget: 1000,
      deliverable_requirements: 'Create 3 posts on Instagram',
      start_date: new Date('2024-01-01'),
      end_date: new Date('2024-01-31')
    };

    const campaignResult = await db.insert(campaignsTable)
      .values({
        ...campaignInput,
        budget: campaignInput.budget.toString()
      })
      .returning()
      .execute();
    const campaign = campaignResult[0];

    // Create collaboration
    const collaborationInput: CreateCollaborationInput = {
      campaign_id: campaign.id,
      influencer_id: influencerProfile.id,
      agreed_price: 500
    };

    const collaborationResult = await db.insert(collaborationsTable)
      .values({
        ...collaborationInput,
        agreed_price: collaborationInput.agreed_price.toString()
      })
      .returning()
      .execute();
    const collaboration = collaborationResult[0];

    // Create multiple deliverables with different creation times
    const deliverable1Input: CreateDeliverableInput = {
      collaboration_id: collaboration.id,
      title: 'First Deliverable',
      description: 'The first deliverable for testing',
      file_url: 'https://example.com/file1.jpg'
    };

    // Add a small delay to ensure different timestamps
    const deliverable1Result = await db.insert(deliverablesTable)
      .values(deliverable1Input)
      .returning()
      .execute();
    const deliverable1 = deliverable1Result[0];

    // Wait a bit to ensure different created_at timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const deliverable2Input: CreateDeliverableInput = {
      collaboration_id: collaboration.id,
      title: 'Second Deliverable',
      description: 'The second deliverable for testing',
      file_url: 'https://example.com/file2.jpg'
    };

    const deliverable2Result = await db.insert(deliverablesTable)
      .values(deliverable2Input)
      .returning()
      .execute();
    const deliverable2 = deliverable2Result[0];

    // Test the handler
    const result = await getCollaborationDeliverables(collaboration.id);

    // Verify we got both deliverables
    expect(result).toHaveLength(2);

    // Verify they are ordered by creation date (earliest first)
    expect(result[0].id).toBe(deliverable1.id);
    expect(result[1].id).toBe(deliverable2.id);

    // Verify the content of the first deliverable
    expect(result[0].title).toBe('First Deliverable');
    expect(result[0].description).toBe('The first deliverable for testing');
    expect(result[0].file_url).toBe('https://example.com/file1.jpg');
    expect(result[0].status).toBe('pending');
    expect(result[0].collaboration_id).toBe(collaboration.id);
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
    expect(result[0].submitted_at).toBeNull();
    expect(result[0].feedback).toBeNull();

    // Verify the content of the second deliverable
    expect(result[1].title).toBe('Second Deliverable');
    expect(result[1].description).toBe('The second deliverable for testing');
    expect(result[1].file_url).toBe('https://example.com/file2.jpg');
    expect(result[1].status).toBe('pending');
    expect(result[1].collaboration_id).toBe(collaboration.id);
    expect(result[1].created_at).toBeInstanceOf(Date);
    expect(result[1].updated_at).toBeInstanceOf(Date);
    expect(result[1].submitted_at).toBeNull();
    expect(result[1].feedback).toBeNull();

    // Verify ordering by creation date
    expect(result[0].created_at.getTime()).toBeLessThan(result[1].created_at.getTime());
  });

  it('should return empty array when no deliverables exist for collaboration', async () => {
    const result = await getCollaborationDeliverables(999); // Non-existent collaboration ID
    expect(result).toHaveLength(0);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return only deliverables for the specified collaboration', async () => {
    // Create test users
    const brandUserInput: CreateUserInput = {
      email: 'brand@test.com',
      password_hash: 'hashed_password',
      user_type: 'brand'
    };

    const brandUserResult = await db.insert(usersTable)
      .values(brandUserInput)
      .returning()
      .execute();
    const brandUser = brandUserResult[0];

    const influencerUserInput: CreateUserInput = {
      email: 'influencer@test.com',
      password_hash: 'hashed_password',
      user_type: 'influencer'
    };

    const influencerUserResult = await db.insert(usersTable)
      .values(influencerUserInput)
      .returning()
      .execute();
    const influencerUser = influencerUserResult[0];

    // Create profiles
    const brandProfileResult = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser.id,
        company_name: 'Test Brand Company'
      })
      .returning()
      .execute();
    const brandProfile = brandProfileResult[0];

    const influencerProfileResult = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser.id,
        display_name: 'Test Influencer',
        total_reach: 50000,
        engagement_rate: '5.5'
      })
      .returning()
      .execute();
    const influencerProfile = influencerProfileResult[0];

    // Create campaign
    const campaignResult = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfile.id,
        title: 'Test Campaign',
        description: 'A test campaign',
        budget: '1000',
        deliverable_requirements: 'Create posts',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31')
      })
      .returning()
      .execute();
    const campaign = campaignResult[0];

    // Create two collaborations
    const collaboration1Result = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign.id,
        influencer_id: influencerProfile.id,
        agreed_price: '500'
      })
      .returning()
      .execute();
    const collaboration1 = collaboration1Result[0];

    const collaboration2Result = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign.id,
        influencer_id: influencerProfile.id,
        agreed_price: '300'
      })
      .returning()
      .execute();
    const collaboration2 = collaboration2Result[0];

    // Create deliverables for both collaborations
    await db.insert(deliverablesTable)
      .values({
        collaboration_id: collaboration1.id,
        title: 'Collaboration 1 Deliverable'
      })
      .execute();

    await db.insert(deliverablesTable)
      .values({
        collaboration_id: collaboration2.id,
        title: 'Collaboration 2 Deliverable'
      })
      .execute();

    // Test that we only get deliverables for collaboration1
    const result = await getCollaborationDeliverables(collaboration1.id);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Collaboration 1 Deliverable');
    expect(result[0].collaboration_id).toBe(collaboration1.id);
  });

  it('should handle deliverables with different statuses and optional fields', async () => {
    // Create prerequisite data
    const brandUserResult = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hashed_password',
        user_type: 'brand'
      })
      .returning()
      .execute();
    const brandUser = brandUserResult[0];

    const influencerUserResult = await db.insert(usersTable)
      .values({
        email: 'influencer@test.com',
        password_hash: 'hashed_password',
        user_type: 'influencer'
      })
      .returning()
      .execute();
    const influencerUser = influencerUserResult[0];

    const brandProfileResult = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser.id,
        company_name: 'Test Brand Company'
      })
      .returning()
      .execute();
    const brandProfile = brandProfileResult[0];

    const influencerProfileResult = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser.id,
        display_name: 'Test Influencer',
        total_reach: 50000,
        engagement_rate: '5.5'
      })
      .returning()
      .execute();
    const influencerProfile = influencerProfileResult[0];

    const campaignResult = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfile.id,
        title: 'Test Campaign',
        description: 'A test campaign',
        budget: '1000',
        deliverable_requirements: 'Create posts',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31')
      })
      .returning()
      .execute();
    const campaign = campaignResult[0];

    const collaborationResult = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign.id,
        influencer_id: influencerProfile.id,
        agreed_price: '500'
      })
      .returning()
      .execute();
    const collaboration = collaborationResult[0];

    // Create deliverable with submitted status and feedback
    const submittedAt = new Date('2024-01-15T10:00:00Z');
    await db.insert(deliverablesTable)
      .values({
        collaboration_id: collaboration.id,
        title: 'Submitted Deliverable',
        description: null, // Test null description
        file_url: null, // Test null file_url
        status: 'submitted',
        feedback: 'Please revise the content',
        submitted_at: submittedAt
      })
      .execute();

    const result = await getCollaborationDeliverables(collaboration.id);

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('Submitted Deliverable');
    expect(result[0].description).toBeNull();
    expect(result[0].file_url).toBeNull();
    expect(result[0].status).toBe('submitted');
    expect(result[0].feedback).toBe('Please revise the content');
    expect(result[0].submitted_at).toBeInstanceOf(Date);
    expect(result[0].submitted_at?.getTime()).toBe(submittedAt.getTime());
  });
});