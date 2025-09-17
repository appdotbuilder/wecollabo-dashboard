import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, influencerProfilesTable } from '../db/schema';
import { type DiscoverInfluencersInput, discoverInfluencers, discoverInfluencersInputSchema } from '../handlers/discover_influencers';

// Test data setup
const createTestUser = async (email: string) => {
  const result = await db.insert(usersTable)
    .values({
      email,
      password_hash: 'hashed_password',
      user_type: 'influencer'
    })
    .returning()
    .execute();
  return result[0];
};

const createTestInfluencerProfile = async (userId: number, overrides: Partial<any> = {}) => {
  const result = await db.insert(influencerProfilesTable)
    .values({
      user_id: userId,
      display_name: 'Test Influencer',
      bio: 'Test bio',
      profile_image: null,
      total_reach: 1000,
      engagement_rate: '5.5',
      total_collaborations: 5,
      rating: '4.0',
      total_earnings: '500.00',
      ...overrides
    })
    .returning()
    .execute();
  
  return {
    ...result[0],
    engagement_rate: parseFloat(result[0].engagement_rate),
    rating: parseFloat(result[0].rating),
    total_earnings: parseFloat(result[0].total_earnings)
  };
};

describe('discoverInfluencers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return all influencers with default parameters', async () => {
    // Create test users and profiles
    const user1 = await createTestUser('influencer1@test.com');
    const user2 = await createTestUser('influencer2@test.com');
    
    await createTestInfluencerProfile(user1.id, {
      display_name: 'Influencer 1',
      total_reach: 5000,
      engagement_rate: '8.5',
      rating: '4.5'
    });
    
    await createTestInfluencerProfile(user2.id, {
      display_name: 'Influencer 2',
      total_reach: 2000,
      engagement_rate: '6.2',
      rating: '3.8'
    });

    const input = discoverInfluencersInputSchema.parse({});
    const results = await discoverInfluencers(input);

    expect(results).toHaveLength(2);
    // Should be sorted by rating desc by default
    expect(results[0].display_name).toBe('Influencer 1');
    expect(results[0].rating).toBe(4.5);
    expect(results[1].display_name).toBe('Influencer 2');
    expect(results[1].rating).toBe(3.8);
  });

  it('should filter by minimum reach', async () => {
    const user1 = await createTestUser('influencer1@test.com');
    const user2 = await createTestUser('influencer2@test.com');
    
    await createTestInfluencerProfile(user1.id, {
      display_name: 'High Reach',
      total_reach: 10000
    });
    
    await createTestInfluencerProfile(user2.id, {
      display_name: 'Low Reach',
      total_reach: 500
    });

    const input = discoverInfluencersInputSchema.parse({
      min_reach: 5000
    });
    const results = await discoverInfluencers(input);

    expect(results).toHaveLength(1);
    expect(results[0].display_name).toBe('High Reach');
    expect(results[0].total_reach).toBe(10000);
  });

  it('should filter by reach range', async () => {
    const user1 = await createTestUser('influencer1@test.com');
    const user2 = await createTestUser('influencer2@test.com');
    const user3 = await createTestUser('influencer3@test.com');
    
    await createTestInfluencerProfile(user1.id, {
      display_name: 'Too Low',
      total_reach: 500
    });
    
    await createTestInfluencerProfile(user2.id, {
      display_name: 'Just Right',
      total_reach: 5000
    });
    
    await createTestInfluencerProfile(user3.id, {
      display_name: 'Too High',
      total_reach: 50000
    });

    const input = discoverInfluencersInputSchema.parse({
      min_reach: 1000,
      max_reach: 10000
    });
    const results = await discoverInfluencers(input);

    expect(results).toHaveLength(1);
    expect(results[0].display_name).toBe('Just Right');
    expect(results[0].total_reach).toBe(5000);
  });

  it('should filter by engagement rate range', async () => {
    const user1 = await createTestUser('influencer1@test.com');
    const user2 = await createTestUser('influencer2@test.com');
    
    await createTestInfluencerProfile(user1.id, {
      display_name: 'High Engagement',
      engagement_rate: '8.5'
    });
    
    await createTestInfluencerProfile(user2.id, {
      display_name: 'Low Engagement',
      engagement_rate: '2.1'
    });

    const input = discoverInfluencersInputSchema.parse({
      min_engagement_rate: 5.0,
      max_engagement_rate: 10.0
    });
    const results = await discoverInfluencers(input);

    expect(results).toHaveLength(1);
    expect(results[0].display_name).toBe('High Engagement');
    expect(results[0].engagement_rate).toBe(8.5);
  });

  it('should filter by minimum rating', async () => {
    const user1 = await createTestUser('influencer1@test.com');
    const user2 = await createTestUser('influencer2@test.com');
    
    await createTestInfluencerProfile(user1.id, {
      display_name: 'High Rated',
      rating: '4.8'
    });
    
    await createTestInfluencerProfile(user2.id, {
      display_name: 'Low Rated',
      rating: '2.5'
    });

    const input = discoverInfluencersInputSchema.parse({
      min_rating: 4.0
    });
    const results = await discoverInfluencers(input);

    expect(results).toHaveLength(1);
    expect(results[0].display_name).toBe('High Rated');
    expect(results[0].rating).toBe(4.8);
  });

  it('should filter by minimum collaborations', async () => {
    const user1 = await createTestUser('influencer1@test.com');
    const user2 = await createTestUser('influencer2@test.com');
    
    await createTestInfluencerProfile(user1.id, {
      display_name: 'Experienced',
      total_collaborations: 15
    });
    
    await createTestInfluencerProfile(user2.id, {
      display_name: 'Newbie',
      total_collaborations: 2
    });

    const input = discoverInfluencersInputSchema.parse({
      min_collaborations: 10
    });
    const results = await discoverInfluencers(input);

    expect(results).toHaveLength(1);
    expect(results[0].display_name).toBe('Experienced');
    expect(results[0].total_collaborations).toBe(15);
  });

  it('should sort by total_reach descending', async () => {
    const user1 = await createTestUser('influencer1@test.com');
    const user2 = await createTestUser('influencer2@test.com');
    const user3 = await createTestUser('influencer3@test.com');
    
    await createTestInfluencerProfile(user1.id, {
      display_name: 'Medium',
      total_reach: 5000
    });
    
    await createTestInfluencerProfile(user2.id, {
      display_name: 'Highest',
      total_reach: 10000
    });
    
    await createTestInfluencerProfile(user3.id, {
      display_name: 'Lowest',
      total_reach: 1000
    });

    const input = discoverInfluencersInputSchema.parse({
      sort_by: 'total_reach',
      sort_order: 'desc'
    });
    const results = await discoverInfluencers(input);

    expect(results).toHaveLength(3);
    expect(results[0].display_name).toBe('Highest');
    expect(results[0].total_reach).toBe(10000);
    expect(results[1].display_name).toBe('Medium');
    expect(results[1].total_reach).toBe(5000);
    expect(results[2].display_name).toBe('Lowest');
    expect(results[2].total_reach).toBe(1000);
  });

  it('should sort by engagement_rate ascending', async () => {
    const user1 = await createTestUser('influencer1@test.com');
    const user2 = await createTestUser('influencer2@test.com');
    
    await createTestInfluencerProfile(user1.id, {
      display_name: 'Higher Engagement',
      engagement_rate: '8.5'
    });
    
    await createTestInfluencerProfile(user2.id, {
      display_name: 'Lower Engagement',
      engagement_rate: '3.2'
    });

    const input = discoverInfluencersInputSchema.parse({
      sort_by: 'engagement_rate',
      sort_order: 'asc'
    });
    const results = await discoverInfluencers(input);

    expect(results).toHaveLength(2);
    expect(results[0].display_name).toBe('Lower Engagement');
    expect(results[0].engagement_rate).toBe(3.2);
    expect(results[1].display_name).toBe('Higher Engagement');
    expect(results[1].engagement_rate).toBe(8.5);
  });

  it('should apply pagination correctly', async () => {
    // Create 5 test profiles
    for (let i = 1; i <= 5; i++) {
      const user = await createTestUser(`influencer${i}@test.com`);
      await createTestInfluencerProfile(user.id, {
        display_name: `Influencer ${i}`,
        rating: (5 - i + 1).toString() // Rating 5, 4, 3, 2, 1
      });
    }

    // Get first 2 results
    const firstPage = await discoverInfluencers(discoverInfluencersInputSchema.parse({
      limit: 2,
      offset: 0,
      sort_by: 'rating',
      sort_order: 'desc'
    }));

    expect(firstPage).toHaveLength(2);
    expect(firstPage[0].display_name).toBe('Influencer 1');
    expect(firstPage[1].display_name).toBe('Influencer 2');

    // Get next 2 results
    const secondPage = await discoverInfluencers(discoverInfluencersInputSchema.parse({
      limit: 2,
      offset: 2,
      sort_by: 'rating',
      sort_order: 'desc'
    }));

    expect(secondPage).toHaveLength(2);
    expect(secondPage[0].display_name).toBe('Influencer 3');
    expect(secondPage[1].display_name).toBe('Influencer 4');
  });

  it('should combine multiple filters', async () => {
    const user1 = await createTestUser('influencer1@test.com');
    const user2 = await createTestUser('influencer2@test.com');
    const user3 = await createTestUser('influencer3@test.com');
    
    // This one matches all criteria
    await createTestInfluencerProfile(user1.id, {
      display_name: 'Perfect Match',
      total_reach: 8000,
      engagement_rate: '7.5',
      rating: '4.5',
      total_collaborations: 12
    });
    
    // This one has low reach
    await createTestInfluencerProfile(user2.id, {
      display_name: 'Low Reach',
      total_reach: 2000,
      engagement_rate: '8.0',
      rating: '4.8',
      total_collaborations: 15
    });
    
    // This one has low rating
    await createTestInfluencerProfile(user3.id, {
      display_name: 'Low Rating',
      total_reach: 10000,
      engagement_rate: '6.0',
      rating: '3.0',
      total_collaborations: 10
    });

    const input = discoverInfluencersInputSchema.parse({
      min_reach: 5000,
      min_engagement_rate: 6.0,
      min_rating: 4.0,
      min_collaborations: 10
    });
    const results = await discoverInfluencers(input);

    expect(results).toHaveLength(1);
    expect(results[0].display_name).toBe('Perfect Match');
  });

  it('should return empty array when no influencers match criteria', async () => {
    const user = await createTestUser('influencer@test.com');
    await createTestInfluencerProfile(user.id, {
      total_reach: 1000,
      rating: '2.0'
    });

    const input = discoverInfluencersInputSchema.parse({
      min_reach: 100000,
      min_rating: 4.5
    });
    const results = await discoverInfluencers(input);

    expect(results).toHaveLength(0);
  });

  it('should convert numeric fields correctly', async () => {
    const user = await createTestUser('influencer@test.com');
    await createTestInfluencerProfile(user.id, {
      engagement_rate: '7.85',
      rating: '4.23',
      total_earnings: '1234.56'
    });

    const results = await discoverInfluencers(discoverInfluencersInputSchema.parse({}));

    expect(results).toHaveLength(1);
    expect(typeof results[0].engagement_rate).toBe('number');
    expect(typeof results[0].rating).toBe('number');
    expect(typeof results[0].total_earnings).toBe('number');
    expect(results[0].engagement_rate).toBe(7.85);
    expect(results[0].rating).toBe(4.23);
    expect(results[0].total_earnings).toBe(1234.56);
  });
});