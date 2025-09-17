import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  influencerProfilesTable, 
  brandProfilesTable, 
  campaignsTable, 
  collaborationsTable, 
  paymentsTable 
} from '../db/schema';
import { getInfluencerEarnings } from '../handlers/get_influencer_earnings';

describe('getInfluencerEarnings', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array for influencer with no payments', async () => {
    // Create an influencer without any collaborations/payments
    const user = await db.insert(usersTable)
      .values({
        email: 'test@example.com',
        password_hash: 'hashed',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const influencer = await db.insert(influencerProfilesTable)
      .values({
        user_id: user[0].id,
        display_name: 'Test Influencer',
        total_reach: 1000,
        engagement_rate: '5.5'
      })
      .returning()
      .execute();

    const result = await getInfluencerEarnings(influencer[0].id);

    expect(result).toEqual([]);
  });

  it('should return payment records for influencer with earnings', async () => {
    // Create users
    const influencerUser = await db.insert(usersTable)
      .values({
        email: 'influencer@example.com',
        password_hash: 'hashed',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const brandUser = await db.insert(usersTable)
      .values({
        email: 'brand@example.com',
        password_hash: 'hashed',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create profiles
    const influencer = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser[0].id,
        display_name: 'Test Influencer',
        total_reach: 10000,
        engagement_rate: '7.2'
      })
      .returning()
      .execute();

    const brand = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser[0].id,
        company_name: 'Test Brand'
      })
      .returning()
      .execute();

    // Create campaign
    const campaign = await db.insert(campaignsTable)
      .values({
        brand_id: brand[0].id,
        title: 'Test Campaign',
        description: 'Campaign description',
        budget: '1000.00',
        deliverable_requirements: 'Test requirements',
        start_date: new Date(),
        end_date: new Date(Date.now() + 86400000) // +1 day
      })
      .returning()
      .execute();

    // Create collaboration
    const collaboration = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign[0].id,
        influencer_id: influencer[0].id,
        agreed_price: '500.00'
      })
      .returning()
      .execute();

    // Create payment
    const payment = await db.insert(paymentsTable)
      .values({
        collaboration_id: collaboration[0].id,
        amount: '500.00',
        platform_commission: '50.00',
        influencer_payout: '450.00',
        status: 'released',
        transaction_id: 'txn_123'
      })
      .returning()
      .execute();

    const result = await getInfluencerEarnings(influencer[0].id);

    expect(result).toHaveLength(1);
    expect(result[0].id).toEqual(payment[0].id);
    expect(result[0].collaboration_id).toEqual(collaboration[0].id);
    expect(result[0].amount).toEqual(500.00);
    expect(typeof result[0].amount).toBe('number');
    expect(result[0].platform_commission).toEqual(50.00);
    expect(typeof result[0].platform_commission).toBe('number');
    expect(result[0].influencer_payout).toEqual(450.00);
    expect(typeof result[0].influencer_payout).toBe('number');
    expect(result[0].status).toEqual('released');
    expect(result[0].transaction_id).toEqual('txn_123');
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should return multiple payment records for influencer with multiple collaborations', async () => {
    // Create users
    const influencerUser = await db.insert(usersTable)
      .values({
        email: 'influencer@example.com',
        password_hash: 'hashed',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const brandUser = await db.insert(usersTable)
      .values({
        email: 'brand@example.com',
        password_hash: 'hashed',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create profiles
    const influencer = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser[0].id,
        display_name: 'Test Influencer',
        total_reach: 10000,
        engagement_rate: '7.2'
      })
      .returning()
      .execute();

    const brand = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser[0].id,
        company_name: 'Test Brand'
      })
      .returning()
      .execute();

    // Create campaigns
    const campaign1 = await db.insert(campaignsTable)
      .values({
        brand_id: brand[0].id,
        title: 'Campaign 1',
        description: 'First campaign',
        budget: '1000.00',
        deliverable_requirements: 'Requirements 1',
        start_date: new Date(),
        end_date: new Date(Date.now() + 86400000)
      })
      .returning()
      .execute();

    const campaign2 = await db.insert(campaignsTable)
      .values({
        brand_id: brand[0].id,
        title: 'Campaign 2',
        description: 'Second campaign',
        budget: '2000.00',
        deliverable_requirements: 'Requirements 2',
        start_date: new Date(),
        end_date: new Date(Date.now() + 86400000)
      })
      .returning()
      .execute();

    // Create collaborations
    const collaboration1 = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign1[0].id,
        influencer_id: influencer[0].id,
        agreed_price: '300.00'
      })
      .returning()
      .execute();

    const collaboration2 = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign2[0].id,
        influencer_id: influencer[0].id,
        agreed_price: '800.00'
      })
      .returning()
      .execute();

    // Create payments
    await db.insert(paymentsTable)
      .values([
        {
          collaboration_id: collaboration1[0].id,
          amount: '300.00',
          platform_commission: '30.00',
          influencer_payout: '270.00',
          status: 'released'
        },
        {
          collaboration_id: collaboration2[0].id,
          amount: '800.00',
          platform_commission: '80.00',
          influencer_payout: '720.00',
          status: 'in_escrow'
        }
      ])
      .execute();

    const result = await getInfluencerEarnings(influencer[0].id);

    expect(result).toHaveLength(2);
    
    // Sort by amount to ensure consistent ordering
    result.sort((a, b) => a.amount - b.amount);

    expect(result[0].amount).toEqual(300.00);
    expect(result[0].platform_commission).toEqual(30.00);
    expect(result[0].influencer_payout).toEqual(270.00);
    expect(result[0].status).toEqual('released');

    expect(result[1].amount).toEqual(800.00);
    expect(result[1].platform_commission).toEqual(80.00);
    expect(result[1].influencer_payout).toEqual(720.00);
    expect(result[1].status).toEqual('in_escrow');
  });

  it('should not return payments for other influencers', async () => {
    // Create users
    const influencer1User = await db.insert(usersTable)
      .values({
        email: 'influencer1@example.com',
        password_hash: 'hashed',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const influencer2User = await db.insert(usersTable)
      .values({
        email: 'influencer2@example.com',
        password_hash: 'hashed',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const brandUser = await db.insert(usersTable)
      .values({
        email: 'brand@example.com',
        password_hash: 'hashed',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create profiles
    const influencer1 = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencer1User[0].id,
        display_name: 'Influencer 1',
        total_reach: 5000,
        engagement_rate: '6.0'
      })
      .returning()
      .execute();

    const influencer2 = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencer2User[0].id,
        display_name: 'Influencer 2',
        total_reach: 8000,
        engagement_rate: '7.5'
      })
      .returning()
      .execute();

    const brand = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser[0].id,
        company_name: 'Test Brand'
      })
      .returning()
      .execute();

    // Create campaign
    const campaign = await db.insert(campaignsTable)
      .values({
        brand_id: brand[0].id,
        title: 'Test Campaign',
        description: 'Campaign description',
        budget: '1500.00',
        deliverable_requirements: 'Test requirements',
        start_date: new Date(),
        end_date: new Date(Date.now() + 86400000)
      })
      .returning()
      .execute();

    // Create collaborations for both influencers
    const collaboration1 = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign[0].id,
        influencer_id: influencer1[0].id,
        agreed_price: '400.00'
      })
      .returning()
      .execute();

    const collaboration2 = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign[0].id,
        influencer_id: influencer2[0].id,
        agreed_price: '600.00'
      })
      .returning()
      .execute();

    // Create payments for both collaborations
    await db.insert(paymentsTable)
      .values([
        {
          collaboration_id: collaboration1[0].id,
          amount: '400.00',
          platform_commission: '40.00',
          influencer_payout: '360.00',
          status: 'released'
        },
        {
          collaboration_id: collaboration2[0].id,
          amount: '600.00',
          platform_commission: '60.00',
          influencer_payout: '540.00',
          status: 'released'
        }
      ])
      .execute();

    // Get earnings for influencer 1 - should only return their payment
    const result1 = await getInfluencerEarnings(influencer1[0].id);
    expect(result1).toHaveLength(1);
    expect(result1[0].amount).toEqual(400.00);
    expect(result1[0].influencer_payout).toEqual(360.00);

    // Get earnings for influencer 2 - should only return their payment
    const result2 = await getInfluencerEarnings(influencer2[0].id);
    expect(result2).toHaveLength(1);
    expect(result2[0].amount).toEqual(600.00);
    expect(result2[0].influencer_payout).toEqual(540.00);
  });

  it('should handle different payment statuses correctly', async () => {
    // Create user and profiles
    const influencerUser = await db.insert(usersTable)
      .values({
        email: 'influencer@example.com',
        password_hash: 'hashed',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const brandUser = await db.insert(usersTable)
      .values({
        email: 'brand@example.com',
        password_hash: 'hashed',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const influencer = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser[0].id,
        display_name: 'Test Influencer',
        total_reach: 10000,
        engagement_rate: '7.2'
      })
      .returning()
      .execute();

    const brand = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser[0].id,
        company_name: 'Test Brand'
      })
      .returning()
      .execute();

    // Create campaign and collaborations
    const campaign = await db.insert(campaignsTable)
      .values({
        brand_id: brand[0].id,
        title: 'Test Campaign',
        description: 'Campaign description',
        budget: '2000.00',
        deliverable_requirements: 'Test requirements',
        start_date: new Date(),
        end_date: new Date(Date.now() + 86400000)
      })
      .returning()
      .execute();

    const collaboration = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign[0].id,
        influencer_id: influencer[0].id,
        agreed_price: '1000.00'
      })
      .returning()
      .execute();

    // Create payments with different statuses
    await db.insert(paymentsTable)
      .values([
        {
          collaboration_id: collaboration[0].id,
          amount: '250.00',
          platform_commission: '25.00',
          influencer_payout: '225.00',
          status: 'pending'
        },
        {
          collaboration_id: collaboration[0].id,
          amount: '250.00',
          platform_commission: '25.00',
          influencer_payout: '225.00',
          status: 'in_escrow'
        },
        {
          collaboration_id: collaboration[0].id,
          amount: '250.00',
          platform_commission: '25.00',
          influencer_payout: '225.00',
          status: 'released'
        },
        {
          collaboration_id: collaboration[0].id,
          amount: '250.00',
          platform_commission: '25.00',
          influencer_payout: '225.00',
          status: 'refunded'
        }
      ])
      .execute();

    const result = await getInfluencerEarnings(influencer[0].id);

    expect(result).toHaveLength(4);
    
    const statuses = result.map(payment => payment.status).sort();
    expect(statuses).toEqual(['in_escrow', 'pending', 'refunded', 'released']);
    
    // All payments should have the same amounts since they're from the same template
    result.forEach(payment => {
      expect(payment.amount).toEqual(250.00);
      expect(payment.platform_commission).toEqual(25.00);
      expect(payment.influencer_payout).toEqual(225.00);
    });
  });
});