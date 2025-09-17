import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, brandProfilesTable, influencerProfilesTable, campaignsTable, collaborationsTable, paymentsTable } from '../db/schema';
import { type CreatePaymentInput } from '../schema';
import { createPayment } from '../handlers/create_payment';
import { eq } from 'drizzle-orm';

describe('createPayment', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  // Helper function to create test data
  const createTestData = async () => {
    // Create brand user
    const brandUser = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hash123',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create influencer user
    const influencerUser = await db.insert(usersTable)
      .values({
        email: 'influencer@test.com',
        password_hash: 'hash456',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    // Create brand profile
    const brandProfile = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser[0].id,
        company_name: 'Test Brand'
      })
      .returning()
      .execute();

    // Create influencer profile
    const influencerProfile = await db.insert(influencerProfilesTable)
      .values({
        user_id: influencerUser[0].id,
        display_name: 'Test Influencer',
        total_reach: 10000,
        engagement_rate: '5.5'
      })
      .returning()
      .execute();

    // Create campaign
    const campaign = await db.insert(campaignsTable)
      .values({
        brand_id: brandProfile[0].id,
        title: 'Test Campaign',
        description: 'Test campaign description',
        budget: '1000.00',
        deliverable_requirements: 'Test requirements',
        start_date: new Date(),
        end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
      })
      .returning()
      .execute();

    // Create collaboration
    const collaboration = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaign[0].id,
        influencer_id: influencerProfile[0].id,
        agreed_price: '500.00'
      })
      .returning()
      .execute();

    return { collaboration: collaboration[0] };
  };

  const testInput: CreatePaymentInput = {
    collaboration_id: 1, // Will be set by test data
    amount: 500.00,
    platform_commission: 50.00,
    influencer_payout: 450.00
  };

  it('should create a payment', async () => {
    const { collaboration } = await createTestData();
    const input = { ...testInput, collaboration_id: collaboration.id };

    const result = await createPayment(input);

    // Basic field validation
    expect(result.collaboration_id).toEqual(collaboration.id);
    expect(result.amount).toEqual(500.00);
    expect(result.platform_commission).toEqual(50.00);
    expect(result.influencer_payout).toEqual(450.00);
    expect(result.status).toEqual('pending');
    expect(result.transaction_id).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Verify numeric types
    expect(typeof result.amount).toBe('number');
    expect(typeof result.platform_commission).toBe('number');
    expect(typeof result.influencer_payout).toBe('number');
  });

  it('should save payment to database', async () => {
    const { collaboration } = await createTestData();
    const input = { ...testInput, collaboration_id: collaboration.id };

    const result = await createPayment(input);

    // Query database to verify payment was saved
    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, result.id))
      .execute();

    expect(payments).toHaveLength(1);
    expect(payments[0].collaboration_id).toEqual(collaboration.id);
    expect(parseFloat(payments[0].amount)).toEqual(500.00);
    expect(parseFloat(payments[0].platform_commission)).toEqual(50.00);
    expect(parseFloat(payments[0].influencer_payout)).toEqual(450.00);
    expect(payments[0].status).toEqual('pending');
    expect(payments[0].transaction_id).toBeNull();
    expect(payments[0].created_at).toBeInstanceOf(Date);
    expect(payments[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle different payment amounts', async () => {
    const { collaboration } = await createTestData();
    
    const largePaymentInput: CreatePaymentInput = {
      collaboration_id: collaboration.id,
      amount: 2500.75,
      platform_commission: 250.08,
      influencer_payout: 2250.67
    };

    const result = await createPayment(largePaymentInput);

    expect(result.amount).toEqual(2500.75);
    expect(result.platform_commission).toEqual(250.08);
    expect(result.influencer_payout).toEqual(2250.67);
  });

  it('should throw error when collaboration does not exist', async () => {
    const invalidInput: CreatePaymentInput = {
      collaboration_id: 99999, // Non-existent collaboration ID
      amount: 500.00,
      platform_commission: 50.00,
      influencer_payout: 450.00
    };

    await expect(createPayment(invalidInput)).rejects.toThrow(/collaboration with id 99999 not found/i);
  });

  it('should create payment with zero commission', async () => {
    const { collaboration } = await createTestData();
    
    const zeroCommissionInput: CreatePaymentInput = {
      collaboration_id: collaboration.id,
      amount: 500.00,
      platform_commission: 0.00,
      influencer_payout: 500.00
    };

    const result = await createPayment(zeroCommissionInput);

    expect(result.platform_commission).toEqual(0.00);
    expect(result.influencer_payout).toEqual(500.00);
    expect(result.amount).toEqual(500.00);
  });

  it('should create multiple payments for same collaboration', async () => {
    const { collaboration } = await createTestData();
    
    const input1 = { ...testInput, collaboration_id: collaboration.id };
    const input2 = { ...testInput, collaboration_id: collaboration.id, amount: 250.00, influencer_payout: 225.00 };

    const result1 = await createPayment(input1);
    const result2 = await createPayment(input2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.collaboration_id).toEqual(result2.collaboration_id);
    expect(result1.amount).toEqual(500.00);
    expect(result2.amount).toEqual(250.00);

    // Verify both payments exist in database
    const allPayments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.collaboration_id, collaboration.id))
      .execute();

    expect(allPayments).toHaveLength(2);
  });
});