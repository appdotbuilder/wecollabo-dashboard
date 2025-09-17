import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, brandProfilesTable, influencerProfilesTable, campaignsTable, collaborationsTable, deliverablesTable } from '../db/schema';
import { type CreateDeliverableInput } from '../schema';
import { createDeliverable } from '../handlers/create_deliverable';
import { eq } from 'drizzle-orm';

// Test setup data
const testUser = {
  email: 'brand@test.com',
  password_hash: 'hashed_password',
  user_type: 'brand' as const
};

const testInfluencerUser = {
  email: 'influencer@test.com',
  password_hash: 'hashed_password',
  user_type: 'influencer' as const
};

const testBrandProfile = {
  user_id: 1,
  company_name: 'Test Brand Co',
  company_description: 'A test brand',
  logo: null,
  website: null,
  industry: 'Technology'
};

const testInfluencerProfile = {
  user_id: 2,
  display_name: 'Test Influencer',
  bio: 'A test influencer',
  profile_image: null,
  total_reach: 10000,
  engagement_rate: '5.5'
};

const testCampaign = {
  brand_id: 1,
  title: 'Test Campaign',
  description: 'A test campaign',
  budget: '1000.00',
  deliverable_requirements: 'Test requirements',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31')
};

const testCollaboration = {
  campaign_id: 1,
  influencer_id: 1,
  agreed_price: '500.00',
  status: 'accepted' as const
};

const testDeliverableInput: CreateDeliverableInput = {
  collaboration_id: 1,
  title: 'Test Deliverable',
  description: 'A test deliverable',
  file_url: 'https://example.com/file.jpg'
};

describe('createDeliverable', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a deliverable for valid collaboration', async () => {
    // Setup prerequisite data
    await db.insert(usersTable).values([testUser, testInfluencerUser]).execute();
    await db.insert(brandProfilesTable).values(testBrandProfile).execute();
    await db.insert(influencerProfilesTable).values(testInfluencerProfile).execute();
    await db.insert(campaignsTable).values(testCampaign).execute();
    await db.insert(collaborationsTable).values(testCollaboration).execute();

    const result = await createDeliverable(testDeliverableInput);

    // Verify returned deliverable
    expect(result.id).toBeDefined();
    expect(result.collaboration_id).toEqual(1);
    expect(result.title).toEqual('Test Deliverable');
    expect(result.description).toEqual('A test deliverable');
    expect(result.file_url).toEqual('https://example.com/file.jpg');
    expect(result.status).toEqual('pending');
    expect(result.feedback).toBeNull();
    expect(result.submitted_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save deliverable to database', async () => {
    // Setup prerequisite data
    await db.insert(usersTable).values([testUser, testInfluencerUser]).execute();
    await db.insert(brandProfilesTable).values(testBrandProfile).execute();
    await db.insert(influencerProfilesTable).values(testInfluencerProfile).execute();
    await db.insert(campaignsTable).values(testCampaign).execute();
    await db.insert(collaborationsTable).values(testCollaboration).execute();

    const result = await createDeliverable(testDeliverableInput);

    // Query database to verify deliverable was saved
    const deliverables = await db.select()
      .from(deliverablesTable)
      .where(eq(deliverablesTable.id, result.id))
      .execute();

    expect(deliverables).toHaveLength(1);
    expect(deliverables[0].collaboration_id).toEqual(1);
    expect(deliverables[0].title).toEqual('Test Deliverable');
    expect(deliverables[0].description).toEqual('A test deliverable');
    expect(deliverables[0].file_url).toEqual('https://example.com/file.jpg');
    expect(deliverables[0].status).toEqual('pending');
    expect(deliverables[0].created_at).toBeInstanceOf(Date);
  });

  it('should handle optional fields correctly', async () => {
    // Setup prerequisite data
    await db.insert(usersTable).values([testUser, testInfluencerUser]).execute();
    await db.insert(brandProfilesTable).values(testBrandProfile).execute();
    await db.insert(influencerProfilesTable).values(testInfluencerProfile).execute();
    await db.insert(campaignsTable).values(testCampaign).execute();
    await db.insert(collaborationsTable).values(testCollaboration).execute();

    const minimalInput: CreateDeliverableInput = {
      collaboration_id: 1,
      title: 'Minimal Deliverable'
    };

    const result = await createDeliverable(minimalInput);

    expect(result.title).toEqual('Minimal Deliverable');
    expect(result.description).toBeNull();
    expect(result.file_url).toBeNull();
    expect(result.status).toEqual('pending');
  });

  it('should work with in_progress collaboration status', async () => {
    // Setup prerequisite data
    await db.insert(usersTable).values([testUser, testInfluencerUser]).execute();
    await db.insert(brandProfilesTable).values(testBrandProfile).execute();
    await db.insert(influencerProfilesTable).values(testInfluencerProfile).execute();
    await db.insert(campaignsTable).values(testCampaign).execute();
    
    const inProgressCollaboration = {
      ...testCollaboration,
      status: 'in_progress' as const
    };
    await db.insert(collaborationsTable).values(inProgressCollaboration).execute();

    const result = await createDeliverable(testDeliverableInput);

    expect(result.collaboration_id).toEqual(1);
    expect(result.title).toEqual('Test Deliverable');
    expect(result.status).toEqual('pending');
  });

  it('should throw error for non-existent collaboration', async () => {
    const invalidInput: CreateDeliverableInput = {
      collaboration_id: 999,
      title: 'Test Deliverable'
    };

    expect(createDeliverable(invalidInput)).rejects.toThrow(/collaboration with id 999 not found/i);
  });

  it('should throw error for pending collaboration status', async () => {
    // Setup prerequisite data
    await db.insert(usersTable).values([testUser, testInfluencerUser]).execute();
    await db.insert(brandProfilesTable).values(testBrandProfile).execute();
    await db.insert(influencerProfilesTable).values(testInfluencerProfile).execute();
    await db.insert(campaignsTable).values(testCampaign).execute();
    
    const pendingCollaboration = {
      ...testCollaboration,
      status: 'pending' as const
    };
    await db.insert(collaborationsTable).values(pendingCollaboration).execute();

    expect(createDeliverable(testDeliverableInput)).rejects.toThrow(/cannot create deliverable for collaboration in pending status/i);
  });

  it('should throw error for declined collaboration status', async () => {
    // Setup prerequisite data
    await db.insert(usersTable).values([testUser, testInfluencerUser]).execute();
    await db.insert(brandProfilesTable).values(testBrandProfile).execute();
    await db.insert(influencerProfilesTable).values(testInfluencerProfile).execute();
    await db.insert(campaignsTable).values(testCampaign).execute();
    
    const declinedCollaboration = {
      ...testCollaboration,
      status: 'declined' as const
    };
    await db.insert(collaborationsTable).values(declinedCollaboration).execute();

    expect(createDeliverable(testDeliverableInput)).rejects.toThrow(/cannot create deliverable for collaboration in declined status/i);
  });

  it('should throw error for completed collaboration status', async () => {
    // Setup prerequisite data
    await db.insert(usersTable).values([testUser, testInfluencerUser]).execute();
    await db.insert(brandProfilesTable).values(testBrandProfile).execute();
    await db.insert(influencerProfilesTable).values(testInfluencerProfile).execute();
    await db.insert(campaignsTable).values(testCampaign).execute();
    
    const completedCollaboration = {
      ...testCollaboration,
      status: 'completed' as const
    };
    await db.insert(collaborationsTable).values(completedCollaboration).execute();

    expect(createDeliverable(testDeliverableInput)).rejects.toThrow(/cannot create deliverable for collaboration in completed status/i);
  });

  it('should throw error for cancelled collaboration status', async () => {
    // Setup prerequisite data
    await db.insert(usersTable).values([testUser, testInfluencerUser]).execute();
    await db.insert(brandProfilesTable).values(testBrandProfile).execute();
    await db.insert(influencerProfilesTable).values(testInfluencerProfile).execute();
    await db.insert(campaignsTable).values(testCampaign).execute();
    
    const cancelledCollaboration = {
      ...testCollaboration,
      status: 'cancelled' as const
    };
    await db.insert(collaborationsTable).values(cancelledCollaboration).execute();

    expect(createDeliverable(testDeliverableInput)).rejects.toThrow(/cannot create deliverable for collaboration in cancelled status/i);
  });
});