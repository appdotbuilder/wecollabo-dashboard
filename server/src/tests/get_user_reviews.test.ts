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
import { getUserReviews } from '../handlers/get_user_reviews';

describe('getUserReviews', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when user has no reviews', async () => {
    // Create a user with no reviews
    const users = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hash123',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const result = await getUserReviews(users[0].id);
    expect(result).toEqual([]);
  });

  it('should return reviews received by a user', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'reviewer@example.com',
          password_hash: 'hash123',
          user_type: 'brand'
        },
        {
          email: 'reviewee@example.com',
          password_hash: 'hash456',
          user_type: 'influencer'
        }
      ])
      .returning()
      .execute();

    const reviewerId = users[0].id;
    const revieweeId = users[1].id;

    // Create brand profile
    const brandProfiles = await db.insert(brandProfilesTable)
      .values({
        user_id: reviewerId,
        company_name: 'Test Brand'
      })
      .returning()
      .execute();

    // Create influencer profile
    const influencerProfiles = await db.insert(influencerProfilesTable)
      .values({
        user_id: revieweeId,
        display_name: 'Test Influencer',
        total_reach: 1000,
        engagement_rate: '5.5'
      })
      .returning()
      .execute();

    // Create campaign
    const campaigns = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfiles[0].id,
        title: 'Test Campaign',
        description: 'Test description',
        budget: '1000.00',
        deliverable_requirements: 'Test requirements',
        start_date: new Date(),
        end_date: new Date()
      })
      .returning()
      .execute();

    // Create collaboration
    const collaborations = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaigns[0].id,
        influencer_id: influencerProfiles[0].id,
        agreed_price: '500.00'
      })
      .returning()
      .execute();

    // Create review
    const reviews = await db.insert(reviewsTable)
      .values({
        collaboration_id: collaborations[0].id,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        rating: 5,
        comment: 'Excellent work!'
      })
      .returning()
      .execute();

    const result = await getUserReviews(revieweeId);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(reviews[0].id);
    expect(result[0].collaboration_id).toEqual(collaborations[0].id);
    expect(result[0].reviewer_id).toEqual(reviewerId);
    expect(result[0].reviewee_id).toEqual(revieweeId);
    expect(result[0].rating).toEqual(5);
    expect(result[0].comment).toEqual('Excellent work!');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple reviews for a user', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'reviewer1@example.com',
          password_hash: 'hash123',
          user_type: 'brand'
        },
        {
          email: 'reviewer2@example.com',
          password_hash: 'hash456',
          user_type: 'brand'
        },
        {
          email: 'reviewee@example.com',
          password_hash: 'hash789',
          user_type: 'influencer'
        }
      ])
      .returning()
      .execute();

    const reviewer1Id = users[0].id;
    const reviewer2Id = users[1].id;
    const revieweeId = users[2].id;

    // Create brand profiles
    const brandProfiles = await db.insert(brandProfilesTable)
      .values([
        {
          user_id: reviewer1Id,
          company_name: 'Test Brand 1'
        },
        {
          user_id: reviewer2Id,
          company_name: 'Test Brand 2'
        }
      ])
      .returning()
      .execute();

    // Create influencer profile
    const influencerProfiles = await db.insert(influencerProfilesTable)
      .values({
        user_id: revieweeId,
        display_name: 'Test Influencer',
        total_reach: 1000,
        engagement_rate: '5.5'
      })
      .returning()
      .execute();

    // Create campaigns
    const campaigns = await db.insert(campaignsTable)
      .values([
        {
          brand_id: brandProfiles[0].id,
          title: 'Test Campaign 1',
          description: 'Test description 1',
          budget: '1000.00',
          deliverable_requirements: 'Test requirements',
          start_date: new Date(),
          end_date: new Date()
        },
        {
          brand_id: brandProfiles[1].id,
          title: 'Test Campaign 2',
          description: 'Test description 2',
          budget: '2000.00',
          deliverable_requirements: 'Test requirements',
          start_date: new Date(),
          end_date: new Date()
        }
      ])
      .returning()
      .execute();

    // Create collaborations
    const collaborations = await db.insert(collaborationsTable)
      .values([
        {
          campaign_id: campaigns[0].id,
          influencer_id: influencerProfiles[0].id,
          agreed_price: '500.00'
        },
        {
          campaign_id: campaigns[1].id,
          influencer_id: influencerProfiles[0].id,
          agreed_price: '750.00'
        }
      ])
      .returning()
      .execute();

    // Create multiple reviews
    await db.insert(reviewsTable)
      .values([
        {
          collaboration_id: collaborations[0].id,
          reviewer_id: reviewer1Id,
          reviewee_id: revieweeId,
          rating: 5,
          comment: 'Great work!'
        },
        {
          collaboration_id: collaborations[1].id,
          reviewer_id: reviewer2Id,
          reviewee_id: revieweeId,
          rating: 4,
          comment: 'Good collaboration'
        }
      ])
      .execute();

    const result = await getUserReviews(revieweeId);

    expect(result).toHaveLength(2);
    expect(result.map(r => r.rating)).toContain(5);
    expect(result.map(r => r.rating)).toContain(4);
    expect(result.map(r => r.comment)).toContain('Great work!');
    expect(result.map(r => r.comment)).toContain('Good collaboration');
  });

  it('should not return reviews where user is the reviewer', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'reviewer@example.com',
          password_hash: 'hash123',
          user_type: 'brand'
        },
        {
          email: 'reviewee@example.com',
          password_hash: 'hash456',
          user_type: 'influencer'
        }
      ])
      .returning()
      .execute();

    const reviewerId = users[0].id;
    const revieweeId = users[1].id;

    // Create brand profile
    const brandProfiles = await db.insert(brandProfilesTable)
      .values({
        user_id: reviewerId,
        company_name: 'Test Brand'
      })
      .returning()
      .execute();

    // Create influencer profile
    const influencerProfiles = await db.insert(influencerProfilesTable)
      .values({
        user_id: revieweeId,
        display_name: 'Test Influencer',
        total_reach: 1000,
        engagement_rate: '5.5'
      })
      .returning()
      .execute();

    // Create campaign
    const campaigns = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfiles[0].id,
        title: 'Test Campaign',
        description: 'Test description',
        budget: '1000.00',
        deliverable_requirements: 'Test requirements',
        start_date: new Date(),
        end_date: new Date()
      })
      .returning()
      .execute();

    // Create collaboration
    const collaborations = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaigns[0].id,
        influencer_id: influencerProfiles[0].id,
        agreed_price: '500.00'
      })
      .returning()
      .execute();

    // Create review where the user is the reviewer, not reviewee
    await db.insert(reviewsTable)
      .values({
        collaboration_id: collaborations[0].id,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        rating: 5,
        comment: 'Great work!'
      })
      .execute();

    // Query reviews for the reviewer (should return empty)
    const result = await getUserReviews(reviewerId);
    expect(result).toEqual([]);

    // Query reviews for the reviewee (should return the review)
    const revieweeResult = await getUserReviews(revieweeId);
    expect(revieweeResult).toHaveLength(1);
  });

  it('should handle reviews with null comments', async () => {
    // Create users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'reviewer@example.com',
          password_hash: 'hash123',
          user_type: 'brand'
        },
        {
          email: 'reviewee@example.com',
          password_hash: 'hash456',
          user_type: 'influencer'
        }
      ])
      .returning()
      .execute();

    const reviewerId = users[0].id;
    const revieweeId = users[1].id;

    // Create brand profile
    const brandProfiles = await db.insert(brandProfilesTable)
      .values({
        user_id: reviewerId,
        company_name: 'Test Brand'
      })
      .returning()
      .execute();

    // Create influencer profile
    const influencerProfiles = await db.insert(influencerProfilesTable)
      .values({
        user_id: revieweeId,
        display_name: 'Test Influencer',
        total_reach: 1000,
        engagement_rate: '5.5'
      })
      .returning()
      .execute();

    // Create campaign
    const campaigns = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfiles[0].id,
        title: 'Test Campaign',
        description: 'Test description',
        budget: '1000.00',
        deliverable_requirements: 'Test requirements',
        start_date: new Date(),
        end_date: new Date()
      })
      .returning()
      .execute();

    // Create collaboration
    const collaborations = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaigns[0].id,
        influencer_id: influencerProfiles[0].id,
        agreed_price: '500.00'
      })
      .returning()
      .execute();

    // Create review with null comment
    await db.insert(reviewsTable)
      .values({
        collaboration_id: collaborations[0].id,
        reviewer_id: reviewerId,
        reviewee_id: revieweeId,
        rating: 3,
        comment: null
      })
      .execute();

    const result = await getUserReviews(revieweeId);

    expect(result).toHaveLength(1);
    expect(result[0].rating).toEqual(3);
    expect(result[0].comment).toBeNull();
  });
});