import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  influencerProfilesTable, 
  brandProfilesTable, 
  campaignsTable, 
  collaborationsTable, 
  reviewsTable 
} from '../db/schema';
import { type CreateReviewInput } from '../schema';
import { createReview } from '../handlers/create_review';
import { eq, and } from 'drizzle-orm';

describe('createReview', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testUsers: any[];
  let testInfluencerProfile: any;
  let testBrandProfile: any;
  let testCampaign: any;
  let testCollaboration: any;

  beforeEach(async () => {
    // Create test users
    testUsers = await db.insert(usersTable)
      .values([
        {
          email: 'influencer@test.com',
          password_hash: 'hash123',
          user_type: 'influencer',
          is_verified: true
        },
        {
          email: 'brand@test.com',
          password_hash: 'hash456',
          user_type: 'brand',
          is_verified: true
        }
      ])
      .returning()
      .execute();

    // Create influencer profile
    const influencerProfiles = await db.insert(influencerProfilesTable)
      .values({
        user_id: testUsers[0].id,
        display_name: 'Test Influencer',
        bio: 'Test bio',
        total_reach: 10000,
        engagement_rate: '5.5'
      })
      .returning()
      .execute();
    
    testInfluencerProfile = influencerProfiles[0];

    // Create brand profile
    const brandProfiles = await db.insert(brandProfilesTable)
      .values({
        user_id: testUsers[1].id,
        company_name: 'Test Brand',
        company_description: 'Test description'
      })
      .returning()
      .execute();
    
    testBrandProfile = brandProfiles[0];

    // Create campaign
    const campaigns = await db.insert(campaignsTable)
      .values({
        brand_id: testBrandProfile.id,
        title: 'Test Campaign',
        description: 'Test campaign description',
        budget: '1000.00',
        deliverable_requirements: 'Test requirements',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-12-31'),
        status: 'active'
      })
      .returning()
      .execute();
    
    testCampaign = campaigns[0];

    // Create completed collaboration
    const collaborations = await db.insert(collaborationsTable)
      .values({
        campaign_id: testCampaign.id,
        influencer_id: testInfluencerProfile.id,
        agreed_price: '500.00',
        status: 'completed'
      })
      .returning()
      .execute();
    
    testCollaboration = collaborations[0];
  });

  const createValidReviewInput = (): CreateReviewInput => ({
    collaboration_id: testCollaboration.id,
    reviewer_id: testUsers[0].id, // influencer reviewing brand
    reviewee_id: testUsers[1].id,
    rating: 4,
    comment: 'Great collaboration experience!'
  });

  it('should create a review successfully', async () => {
    const input = createValidReviewInput();
    const result = await createReview(input);

    // Verify returned data
    expect(result.collaboration_id).toEqual(testCollaboration.id);
    expect(result.reviewer_id).toEqual(testUsers[0].id);
    expect(result.reviewee_id).toEqual(testUsers[1].id);
    expect(result.rating).toEqual(4);
    expect(result.comment).toEqual('Great collaboration experience!');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save review to database', async () => {
    const input = createValidReviewInput();
    const result = await createReview(input);

    // Verify in database
    const reviews = await db.select()
      .from(reviewsTable)
      .where(eq(reviewsTable.id, result.id))
      .execute();

    expect(reviews).toHaveLength(1);
    expect(reviews[0].collaboration_id).toEqual(testCollaboration.id);
    expect(reviews[0].reviewer_id).toEqual(testUsers[0].id);
    expect(reviews[0].reviewee_id).toEqual(testUsers[1].id);
    expect(reviews[0].rating).toEqual(4);
    expect(reviews[0].comment).toEqual('Great collaboration experience!');
  });

  it('should allow brand to review influencer', async () => {
    const input: CreateReviewInput = {
      collaboration_id: testCollaboration.id,
      reviewer_id: testUsers[1].id, // brand reviewing influencer
      reviewee_id: testUsers[0].id,
      rating: 5,
      comment: 'Excellent work!'
    };

    const result = await createReview(input);

    expect(result.reviewer_id).toEqual(testUsers[1].id);
    expect(result.reviewee_id).toEqual(testUsers[0].id);
    expect(result.rating).toEqual(5);
    expect(result.comment).toEqual('Excellent work!');
  });

  it('should create review without comment', async () => {
    const input: CreateReviewInput = {
      collaboration_id: testCollaboration.id,
      reviewer_id: testUsers[0].id,
      reviewee_id: testUsers[1].id,
      rating: 3
      // comment is optional
    };

    const result = await createReview(input);

    expect(result.comment).toBeNull();
    expect(result.rating).toEqual(3);
  });

  it('should throw error for non-existent collaboration', async () => {
    const input: CreateReviewInput = {
      collaboration_id: 99999,
      reviewer_id: testUsers[0].id,
      reviewee_id: testUsers[1].id,
      rating: 4,
      comment: 'Test review'
    };

    await expect(createReview(input)).rejects.toThrow(/collaboration not found/i);
  });

  it('should throw error for non-completed collaboration', async () => {
    // Create a pending collaboration
    const pendingCollaborations = await db.insert(collaborationsTable)
      .values({
        campaign_id: testCampaign.id,
        influencer_id: testInfluencerProfile.id,
        agreed_price: '300.00',
        status: 'pending'
      })
      .returning()
      .execute();

    const input: CreateReviewInput = {
      collaboration_id: pendingCollaborations[0].id,
      reviewer_id: testUsers[0].id,
      reviewee_id: testUsers[1].id,
      rating: 4,
      comment: 'Test review'
    };

    await expect(createReview(input)).rejects.toThrow(/reviews can only be created for completed collaborations/i);
  });

  it('should throw error for unauthorized reviewer', async () => {
    // Create another user who is not part of the collaboration
    const unauthorizedUsers = await db.insert(usersTable)
      .values({
        email: 'unauthorized@test.com',
        password_hash: 'hash789',
        user_type: 'brand',
        is_verified: true
      })
      .returning()
      .execute();

    const input: CreateReviewInput = {
      collaboration_id: testCollaboration.id,
      reviewer_id: unauthorizedUsers[0].id,
      reviewee_id: testUsers[1].id,
      rating: 4,
      comment: 'Unauthorized review'
    };

    await expect(createReview(input)).rejects.toThrow(/only collaboration participants can create reviews/i);
  });

  it('should throw error for invalid reviewee', async () => {
    // Try to review someone who is not the other party in the collaboration
    const otherUsers = await db.insert(usersTable)
      .values({
        email: 'other@test.com',
        password_hash: 'hash999',
        user_type: 'influencer',
        is_verified: true
      })
      .returning()
      .execute();

    const input: CreateReviewInput = {
      collaboration_id: testCollaboration.id,
      reviewer_id: testUsers[0].id, // valid reviewer
      reviewee_id: otherUsers[0].id, // invalid reviewee
      rating: 4,
      comment: 'Invalid reviewee test'
    };

    await expect(createReview(input)).rejects.toThrow(/invalid reviewee - must be the other party in the collaboration/i);
  });

  it('should throw error when review already exists', async () => {
    // Create initial review
    const input = createValidReviewInput();
    await createReview(input);

    // Try to create another review from the same reviewer for the same collaboration
    const duplicateInput: CreateReviewInput = {
      collaboration_id: testCollaboration.id,
      reviewer_id: testUsers[0].id,
      reviewee_id: testUsers[1].id,
      rating: 2,
      comment: 'Duplicate review attempt'
    };

    await expect(createReview(duplicateInput)).rejects.toThrow(/review already exists for this collaboration from this reviewer/i);
  });

  it('should allow both parties to review each other', async () => {
    // Influencer reviews brand
    const influencerReviewInput: CreateReviewInput = {
      collaboration_id: testCollaboration.id,
      reviewer_id: testUsers[0].id,
      reviewee_id: testUsers[1].id,
      rating: 4,
      comment: 'Brand was professional'
    };

    const influencerReview = await createReview(influencerReviewInput);

    // Brand reviews influencer
    const brandReviewInput: CreateReviewInput = {
      collaboration_id: testCollaboration.id,
      reviewer_id: testUsers[1].id,
      reviewee_id: testUsers[0].id,
      rating: 5,
      comment: 'Influencer delivered great content'
    };

    const brandReview = await createReview(brandReviewInput);

    // Verify both reviews exist
    expect(influencerReview.id).toBeDefined();
    expect(brandReview.id).toBeDefined();
    expect(influencerReview.id).not.toEqual(brandReview.id);

    // Verify both reviews are in database
    const allReviews = await db.select()
      .from(reviewsTable)
      .where(eq(reviewsTable.collaboration_id, testCollaboration.id))
      .execute();

    expect(allReviews).toHaveLength(2);
  });

  it('should handle edge case rating values correctly', async () => {
    // Test minimum rating
    const minRatingInput: CreateReviewInput = {
      collaboration_id: testCollaboration.id,
      reviewer_id: testUsers[0].id,
      reviewee_id: testUsers[1].id,
      rating: 1,
      comment: 'Minimum rating test'
    };

    const minResult = await createReview(minRatingInput);
    expect(minResult.rating).toEqual(1);

    // Create another collaboration for max rating test
    const newCollaborations = await db.insert(collaborationsTable)
      .values({
        campaign_id: testCampaign.id,
        influencer_id: testInfluencerProfile.id,
        agreed_price: '400.00',
        status: 'completed'
      })
      .returning()
      .execute();

    // Test maximum rating
    const maxRatingInput: CreateReviewInput = {
      collaboration_id: newCollaborations[0].id,
      reviewer_id: testUsers[1].id,
      reviewee_id: testUsers[0].id,
      rating: 5,
      comment: 'Maximum rating test'
    };

    const maxResult = await createReview(maxRatingInput);
    expect(maxResult.rating).toEqual(5);
  });
});