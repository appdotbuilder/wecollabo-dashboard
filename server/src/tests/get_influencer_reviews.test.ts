import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, brandProfilesTable, influencerProfilesTable, reviewsTable } from '../db/schema';
import { type GetInfluencerReviewsInput } from '../schema';
import { getInfluencerReviews } from '../handlers/get_influencer_reviews';

describe('getInfluencerReviews', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return reviews with brand information for an influencer', async () => {
    // Create brand user
    const brandUsers = await db.insert(usersTable)
      .values({
        email: 'brand@example.com',
        password: 'password123',
        user_type: 'brand'
      })
      .returning()
      .execute();
    const brandUser = brandUsers[0];

    // Create brand profile
    await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser.id,
        company_name: 'Amazing Brand Co.',
        description: 'A great brand',
        website: 'https://amazingbrand.com',
        industry: 'Fashion',
        logo_url: 'https://example.com/logo.png'
      })
      .execute();

    // Create influencer user
    const influencerUsers = await db.insert(usersTable)
      .values({
        email: 'influencer@example.com',
        password: 'password123',
        user_type: 'influencer'
      })
      .returning()
      .execute();
    const influencerUser = influencerUsers[0];

    // Create influencer profile
    await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser.id,
        display_name: 'Test Influencer',
        bio: 'Test bio'
      })
      .execute();

    // Create review
    await db.insert(reviewsTable)
      .values({
        brand_user_id: brandUser.id,
        influencer_user_id: influencerUser.id,
        rating: 5,
        feedback: 'Excellent collaboration! Very professional and delivered great content.'
      })
      .execute();

    const input: GetInfluencerReviewsInput = {
      influencer_user_id: influencerUser.id
    };

    const result = await getInfluencerReviews(input);

    expect(result).toHaveLength(1);
    expect(result[0].brand_user_id).toEqual(brandUser.id);
    expect(result[0].influencer_user_id).toEqual(influencerUser.id);
    expect(result[0].rating).toEqual(5);
    expect(result[0].feedback).toEqual('Excellent collaboration! Very professional and delivered great content.');
    expect(result[0].brand_company_name).toEqual('Amazing Brand Co.');
    expect(result[0].brand_logo_url).toEqual('https://example.com/logo.png');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple reviews ordered by created_at (newest first)', async () => {
    // Create brand user
    const brandUsers = await db.insert(usersTable)
      .values({
        email: 'brand@example.com',
        password: 'password123',
        user_type: 'brand'
      })
      .returning()
      .execute();
    const brandUser = brandUsers[0];

    // Create brand profile
    await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser.id,
        company_name: 'Brand Company',
        description: 'A brand company'
      })
      .execute();

    // Create second brand user
    const brandUsers2 = await db.insert(usersTable)
      .values({
        email: 'brand2@example.com',
        password: 'password123',
        user_type: 'brand'
      })
      .returning()
      .execute();
    const brandUser2 = brandUsers2[0];

    // Create second brand profile
    await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser2.id,
        company_name: 'Second Brand Co.',
        description: 'Another brand'
      })
      .execute();

    // Create influencer user
    const influencerUsers = await db.insert(usersTable)
      .values({
        email: 'influencer@example.com',
        password: 'password123',
        user_type: 'influencer'
      })
      .returning()
      .execute();
    const influencerUser = influencerUsers[0];

    // Create influencer profile
    await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser.id,
        display_name: 'Test Influencer'
      })
      .execute();

    // Create first review (older)
    const firstReview = await db.insert(reviewsTable)
      .values({
        brand_user_id: brandUser.id,
        influencer_user_id: influencerUser.id,
        rating: 4,
        feedback: 'Good work, but could be better.'
      })
      .returning()
      .execute();

    // Wait a bit to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    // Create second review (newer)
    const secondReview = await db.insert(reviewsTable)
      .values({
        brand_user_id: brandUser2.id,
        influencer_user_id: influencerUser.id,
        rating: 5,
        feedback: 'Amazing collaboration!'
      })
      .returning()
      .execute();

    const input: GetInfluencerReviewsInput = {
      influencer_user_id: influencerUser.id
    };

    const result = await getInfluencerReviews(input);

    expect(result).toHaveLength(2);
    
    // Should be ordered by created_at desc (newest first)
    expect(result[0].id).toEqual(secondReview[0].id);
    expect(result[0].rating).toEqual(5);
    expect(result[0].feedback).toEqual('Amazing collaboration!');
    expect(result[0].brand_company_name).toEqual('Second Brand Co.');
    
    expect(result[1].id).toEqual(firstReview[0].id);
    expect(result[1].rating).toEqual(4);
    expect(result[1].feedback).toEqual('Good work, but could be better.');
    expect(result[1].brand_company_name).toEqual('Brand Company');
  });

  it('should return empty array when influencer has no reviews', async () => {
    // Create influencer user
    const influencerUsers = await db.insert(usersTable)
      .values({
        email: 'influencer@example.com',
        password: 'password123',
        user_type: 'influencer'
      })
      .returning()
      .execute();
    const influencerUser = influencerUsers[0];

    // Create influencer profile
    await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser.id,
        display_name: 'Test Influencer'
      })
      .execute();

    const input: GetInfluencerReviewsInput = {
      influencer_user_id: influencerUser.id
    };

    const result = await getInfluencerReviews(input);

    expect(result).toHaveLength(0);
  });

  it('should handle brand profiles with null logo_url', async () => {
    // Create brand user
    const brandUsers = await db.insert(usersTable)
      .values({
        email: 'brand@example.com',
        password: 'password123',
        user_type: 'brand'
      })
      .returning()
      .execute();
    const brandUser = brandUsers[0];

    // Create brand profile with null logo_url
    await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser.id,
        company_name: 'Brand Without Logo',
        description: 'A brand without logo',
        logo_url: null
      })
      .execute();

    // Create influencer user
    const influencerUsers = await db.insert(usersTable)
      .values({
        email: 'influencer@example.com',
        password: 'password123',
        user_type: 'influencer'
      })
      .returning()
      .execute();
    const influencerUser = influencerUsers[0];

    // Create influencer profile
    await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser.id,
        display_name: 'Test Influencer'
      })
      .execute();

    // Create review
    await db.insert(reviewsTable)
      .values({
        brand_user_id: brandUser.id,
        influencer_user_id: influencerUser.id,
        rating: 3,
        feedback: 'Average work.'
      })
      .execute();

    const input: GetInfluencerReviewsInput = {
      influencer_user_id: influencerUser.id
    };

    const result = await getInfluencerReviews(input);

    expect(result).toHaveLength(1);
    expect(result[0].brand_company_name).toEqual('Brand Without Logo');
    expect(result[0].brand_logo_url).toBeNull();
    expect(result[0].rating).toEqual(3);
    expect(result[0].feedback).toEqual('Average work.');
  });

  it('should return reviews only for the specified influencer', async () => {
    // Create brand user
    const brandUsers = await db.insert(usersTable)
      .values({
        email: 'brand@example.com',
        password: 'password123',
        user_type: 'brand'
      })
      .returning()
      .execute();
    const brandUser = brandUsers[0];

    // Create brand profile
    await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser.id,
        company_name: 'Test Brand',
        description: 'A test brand'
      })
      .execute();

    // Create first influencer
    const influencer1Users = await db.insert(usersTable)
      .values({
        email: 'influencer1@example.com',
        password: 'password123',
        user_type: 'influencer'
      })
      .returning()
      .execute();
    const influencer1User = influencer1Users[0];

    await db.insert(influencerProfilesTable)
      .values({
        user_id: influencer1User.id,
        display_name: 'First Influencer'
      })
      .execute();

    // Create second influencer
    const influencer2Users = await db.insert(usersTable)
      .values({
        email: 'influencer2@example.com',
        password: 'password123',
        user_type: 'influencer'
      })
      .returning()
      .execute();
    const influencer2User = influencer2Users[0];

    await db.insert(influencerProfilesTable)
      .values({
        user_id: influencer2User.id,
        display_name: 'Second Influencer'
      })
      .execute();

    // Create reviews for both influencers
    await db.insert(reviewsTable)
      .values([
        {
          brand_user_id: brandUser.id,
          influencer_user_id: influencer1User.id,
          rating: 4,
          feedback: 'Review for first influencer.'
        },
        {
          brand_user_id: brandUser.id,
          influencer_user_id: influencer2User.id,
          rating: 5,
          feedback: 'Review for second influencer.'
        }
      ])
      .execute();

    // Query reviews for first influencer only
    const input: GetInfluencerReviewsInput = {
      influencer_user_id: influencer1User.id
    };

    const result = await getInfluencerReviews(input);

    expect(result).toHaveLength(1);
    expect(result[0].influencer_user_id).toEqual(influencer1User.id);
    expect(result[0].feedback).toEqual('Review for first influencer.');
    expect(result[0].rating).toEqual(4);
  });
});