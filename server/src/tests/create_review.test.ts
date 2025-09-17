import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, reviewsTable } from '../db/schema';
import { type CreateReviewInput } from '../schema';
import { createReview } from '../handlers/create_review';
import { eq, and } from 'drizzle-orm';

describe('createReview', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let brandUserId: number;
  let influencerUserId: number;

  beforeEach(async () => {
    // Create a brand user
    const brandResult = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password: 'password123',
        user_type: 'brand'
      })
      .returning()
      .execute();
    brandUserId = brandResult[0].id;

    // Create an influencer user
    const influencerResult = await db.insert(usersTable)
      .values({
        email: 'influencer@test.com',
        password: 'password123',
        user_type: 'influencer'
      })
      .returning()
      .execute();
    influencerUserId = influencerResult[0].id;
  });

  const testInput: CreateReviewInput = {
    brand_user_id: 0, // Will be set in tests
    influencer_user_id: 0, // Will be set in tests
    rating: 4,
    feedback: 'Great work on the campaign!'
  };

  it('should create a review successfully', async () => {
    const input = {
      ...testInput,
      brand_user_id: brandUserId,
      influencer_user_id: influencerUserId
    };

    const result = await createReview(input);

    expect(result.brand_user_id).toEqual(brandUserId);
    expect(result.influencer_user_id).toEqual(influencerUserId);
    expect(result.rating).toEqual(4);
    expect(result.feedback).toEqual('Great work on the campaign!');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save review to database', async () => {
    const input = {
      ...testInput,
      brand_user_id: brandUserId,
      influencer_user_id: influencerUserId
    };

    const result = await createReview(input);

    const reviews = await db.select()
      .from(reviewsTable)
      .where(eq(reviewsTable.id, result.id))
      .execute();

    expect(reviews).toHaveLength(1);
    expect(reviews[0].brand_user_id).toEqual(brandUserId);
    expect(reviews[0].influencer_user_id).toEqual(influencerUserId);
    expect(reviews[0].rating).toEqual(4);
    expect(reviews[0].feedback).toEqual('Great work on the campaign!');
    expect(reviews[0].created_at).toBeInstanceOf(Date);
    expect(reviews[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when brand user does not exist', async () => {
    const input = {
      ...testInput,
      brand_user_id: 99999, // Non-existent user
      influencer_user_id: influencerUserId
    };

    await expect(createReview(input)).rejects.toThrow(/brand user not found/i);
  });

  it('should throw error when influencer user does not exist', async () => {
    const input = {
      ...testInput,
      brand_user_id: brandUserId,
      influencer_user_id: 99999 // Non-existent user
    };

    await expect(createReview(input)).rejects.toThrow(/influencer user not found/i);
  });

  it('should throw error when brand_user_id is not a brand', async () => {
    // Create another user of type 'influencer'
    const anotherInfluencerResult = await db.insert(usersTable)
      .values({
        email: 'another-influencer@test.com',
        password: 'password123',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      brand_user_id: anotherInfluencerResult[0].id, // Using influencer as brand
      influencer_user_id: influencerUserId
    };

    await expect(createReview(input)).rejects.toThrow(/user is not a brand/i);
  });

  it('should throw error when influencer_user_id is not an influencer', async () => {
    // Create another user of type 'brand'
    const anotherBrandResult = await db.insert(usersTable)
      .values({
        email: 'another-brand@test.com',
        password: 'password123',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const input = {
      ...testInput,
      brand_user_id: brandUserId,
      influencer_user_id: anotherBrandResult[0].id // Using brand as influencer
    };

    await expect(createReview(input)).rejects.toThrow(/user is not an influencer/i);
  });

  it('should prevent duplicate reviews from same brand to same influencer', async () => {
    const input = {
      ...testInput,
      brand_user_id: brandUserId,
      influencer_user_id: influencerUserId
    };

    // Create first review
    await createReview(input);

    // Attempt to create duplicate review
    await expect(createReview(input)).rejects.toThrow(/review already exists/i);
  });

  it('should allow different brands to review the same influencer', async () => {
    // Create another brand user
    const anotherBrandResult = await db.insert(usersTable)
      .values({
        email: 'another-brand@test.com',
        password: 'password123',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const firstInput = {
      ...testInput,
      brand_user_id: brandUserId,
      influencer_user_id: influencerUserId
    };

    const secondInput = {
      ...testInput,
      brand_user_id: anotherBrandResult[0].id,
      influencer_user_id: influencerUserId,
      rating: 5,
      feedback: 'Excellent collaboration!'
    };

    // Both reviews should succeed
    const firstReview = await createReview(firstInput);
    const secondReview = await createReview(secondInput);

    expect(firstReview.id).not.toEqual(secondReview.id);
    expect(firstReview.brand_user_id).not.toEqual(secondReview.brand_user_id);
    expect(firstReview.influencer_user_id).toEqual(secondReview.influencer_user_id);
  });

  it('should allow same brand to review different influencers', async () => {
    // Create another influencer user
    const anotherInfluencerResult = await db.insert(usersTable)
      .values({
        email: 'another-influencer@test.com',
        password: 'password123',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const firstInput = {
      ...testInput,
      brand_user_id: brandUserId,
      influencer_user_id: influencerUserId
    };

    const secondInput = {
      ...testInput,
      brand_user_id: brandUserId,
      influencer_user_id: anotherInfluencerResult[0].id,
      rating: 3,
      feedback: 'Good work, room for improvement'
    };

    // Both reviews should succeed
    const firstReview = await createReview(firstInput);
    const secondReview = await createReview(secondInput);

    expect(firstReview.id).not.toEqual(secondReview.id);
    expect(firstReview.brand_user_id).toEqual(secondReview.brand_user_id);
    expect(firstReview.influencer_user_id).not.toEqual(secondReview.influencer_user_id);
  });

  it('should handle edge case ratings correctly', async () => {
    const minRatingInput = {
      ...testInput,
      brand_user_id: brandUserId,
      influencer_user_id: influencerUserId,
      rating: 1,
      feedback: 'Needs improvement'
    };

    const result = await createReview(minRatingInput);
    expect(result.rating).toEqual(1);

    // Create another influencer for max rating test
    const anotherInfluencerResult = await db.insert(usersTable)
      .values({
        email: 'another-influencer@test.com',
        password: 'password123',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const maxRatingInput = {
      ...testInput,
      brand_user_id: brandUserId,
      influencer_user_id: anotherInfluencerResult[0].id,
      rating: 5,
      feedback: 'Outstanding work!'
    };

    const maxResult = await createReview(maxRatingInput);
    expect(maxResult.rating).toEqual(5);
  });
});