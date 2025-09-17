import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, brandProfilesTable, influencerProfilesTable, campaignsTable, collaborationsTable, paymentsTable } from '../db/schema';
import { type UpdatePaymentStatusInput, type CreateUserInput, type CreateBrandProfileInput, type CreateInfluencerProfileInput, type CreateCampaignInput, type CreateCollaborationInput, type CreatePaymentInput } from '../schema';
import { updatePaymentStatus } from '../handlers/update_payment_status';
import { eq } from 'drizzle-orm';

// Test data setup helpers
const createTestUser = async (userType: 'brand' | 'influencer', email: string) => {
  const userInput: CreateUserInput = {
    email,
    password_hash: 'hashed_password',
    user_type: userType
  };

  const result = await db.insert(usersTable)
    .values(userInput)
    .returning()
    .execute();

  return result[0];
};

const createTestBrandProfile = async (userId: number) => {
  const brandInput: CreateBrandProfileInput = {
    user_id: userId,
    company_name: 'Test Brand Co.'
  };

  const result = await db.insert(brandProfilesTable)
    .values(brandInput)
    .returning()
    .execute();

  return result[0];
};

const createTestInfluencerProfile = async (userId: number) => {
  const influencerInput: CreateInfluencerProfileInput = {
    user_id: userId,
    display_name: 'Test Influencer',
    total_reach: 10000,
    engagement_rate: 5.5
  };

  const result = await db.insert(influencerProfilesTable)
    .values({
      ...influencerInput,
      engagement_rate: influencerInput.engagement_rate.toString()
    })
    .returning()
    .execute();

  return result[0];
};

const createTestCampaign = async (brandId: number) => {
  const campaignInput: CreateCampaignInput = {
    brand_id: brandId,
    title: 'Test Campaign',
    description: 'A test campaign',
    budget: 1000,
    deliverable_requirements: 'Post on Instagram',
    start_date: new Date(),
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  };

  const result = await db.insert(campaignsTable)
    .values({
      ...campaignInput,
      budget: campaignInput.budget.toString()
    })
    .returning()
    .execute();

  return result[0];
};

const createTestCollaboration = async (campaignId: number, influencerId: number) => {
  const collaborationInput: CreateCollaborationInput = {
    campaign_id: campaignId,
    influencer_id: influencerId,
    agreed_price: 500
  };

  const result = await db.insert(collaborationsTable)
    .values({
      ...collaborationInput,
      agreed_price: collaborationInput.agreed_price.toString()
    })
    .returning()
    .execute();

  return result[0];
};

const createTestPayment = async (collaborationId: number) => {
  const paymentInput: CreatePaymentInput = {
    collaboration_id: collaborationId,
    amount: 500,
    platform_commission: 50,
    influencer_payout: 450
  };

  const result = await db.insert(paymentsTable)
    .values({
      collaboration_id: paymentInput.collaboration_id,
      amount: paymentInput.amount.toString(),
      platform_commission: paymentInput.platform_commission.toString(),
      influencer_payout: paymentInput.influencer_payout.toString()
    })
    .returning()
    .execute();

  return result[0];
};

describe('updatePaymentStatus', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update payment status successfully', async () => {
    // Create prerequisite data
    const brandUser = await createTestUser('brand', 'brand@test.com');
    const influencerUser = await createTestUser('influencer', 'influencer@test.com');
    const brandProfile = await createTestBrandProfile(brandUser.id);
    const influencerProfile = await createTestInfluencerProfile(influencerUser.id);
    const campaign = await createTestCampaign(brandProfile.id);
    const collaboration = await createTestCollaboration(campaign.id, influencerProfile.id);
    const payment = await createTestPayment(collaboration.id);

    const input: UpdatePaymentStatusInput = {
      id: payment.id,
      status: 'in_escrow'
    };

    const result = await updatePaymentStatus(input);

    // Verify the result
    expect(result.id).toEqual(payment.id);
    expect(result.status).toEqual('in_escrow');
    expect(result.collaboration_id).toEqual(collaboration.id);
    expect(result.amount).toEqual(500);
    expect(result.platform_commission).toEqual(50);
    expect(result.influencer_payout).toEqual(450);
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.transaction_id).toBeNull();

    // Verify numeric types
    expect(typeof result.amount).toBe('number');
    expect(typeof result.platform_commission).toBe('number');
    expect(typeof result.influencer_payout).toBe('number');
  });

  it('should update payment status with transaction_id', async () => {
    // Create prerequisite data
    const brandUser = await createTestUser('brand', 'brand@test.com');
    const influencerUser = await createTestUser('influencer', 'influencer@test.com');
    const brandProfile = await createTestBrandProfile(brandUser.id);
    const influencerProfile = await createTestInfluencerProfile(influencerUser.id);
    const campaign = await createTestCampaign(brandProfile.id);
    const collaboration = await createTestCollaboration(campaign.id, influencerProfile.id);
    const payment = await createTestPayment(collaboration.id);

    const input: UpdatePaymentStatusInput = {
      id: payment.id,
      status: 'released',
      transaction_id: 'txn_123456789'
    };

    const result = await updatePaymentStatus(input);

    // Verify the result
    expect(result.id).toEqual(payment.id);
    expect(result.status).toEqual('released');
    expect(result.transaction_id).toEqual('txn_123456789');
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should persist changes to database', async () => {
    // Create prerequisite data
    const brandUser = await createTestUser('brand', 'brand@test.com');
    const influencerUser = await createTestUser('influencer', 'influencer@test.com');
    const brandProfile = await createTestBrandProfile(brandUser.id);
    const influencerProfile = await createTestInfluencerProfile(influencerUser.id);
    const campaign = await createTestCampaign(brandProfile.id);
    const collaboration = await createTestCollaboration(campaign.id, influencerProfile.id);
    const payment = await createTestPayment(collaboration.id);

    const input: UpdatePaymentStatusInput = {
      id: payment.id,
      status: 'in_escrow',
      transaction_id: 'txn_escrow_123'
    };

    await updatePaymentStatus(input);

    // Query database to verify persistence
    const payments = await db.select()
      .from(paymentsTable)
      .where(eq(paymentsTable.id, payment.id))
      .execute();

    expect(payments).toHaveLength(1);
    expect(payments[0].status).toEqual('in_escrow');
    expect(payments[0].transaction_id).toEqual('txn_escrow_123');
    expect(payments[0].updated_at).toBeInstanceOf(Date);
  });

  it('should handle various status transitions', async () => {
    // Create prerequisite data
    const brandUser = await createTestUser('brand', 'brand@test.com');
    const influencerUser = await createTestUser('influencer', 'influencer@test.com');
    const brandProfile = await createTestBrandProfile(brandUser.id);
    const influencerProfile = await createTestInfluencerProfile(influencerUser.id);
    const campaign = await createTestCampaign(brandProfile.id);
    const collaboration = await createTestCollaboration(campaign.id, influencerProfile.id);
    const payment = await createTestPayment(collaboration.id);

    // Test pending -> in_escrow
    const escrowInput: UpdatePaymentStatusInput = {
      id: payment.id,
      status: 'in_escrow',
      transaction_id: 'txn_escrow_123'
    };

    const escrowResult = await updatePaymentStatus(escrowInput);
    expect(escrowResult.status).toEqual('in_escrow');
    expect(escrowResult.transaction_id).toEqual('txn_escrow_123');

    // Test in_escrow -> released
    const releasedInput: UpdatePaymentStatusInput = {
      id: payment.id,
      status: 'released',
      transaction_id: 'txn_released_456'
    };

    const releasedResult = await updatePaymentStatus(releasedInput);
    expect(releasedResult.status).toEqual('released');
    expect(releasedResult.transaction_id).toEqual('txn_released_456');
  });

  it('should handle refunded status', async () => {
    // Create prerequisite data
    const brandUser = await createTestUser('brand', 'brand@test.com');
    const influencerUser = await createTestUser('influencer', 'influencer@test.com');
    const brandProfile = await createTestBrandProfile(brandUser.id);
    const influencerProfile = await createTestInfluencerProfile(influencerUser.id);
    const campaign = await createTestCampaign(brandProfile.id);
    const collaboration = await createTestCollaboration(campaign.id, influencerProfile.id);
    const payment = await createTestPayment(collaboration.id);

    const input: UpdatePaymentStatusInput = {
      id: payment.id,
      status: 'refunded',
      transaction_id: 'txn_refund_789'
    };

    const result = await updatePaymentStatus(input);

    expect(result.status).toEqual('refunded');
    expect(result.transaction_id).toEqual('txn_refund_789');
  });

  it('should throw error for non-existent payment', async () => {
    const input: UpdatePaymentStatusInput = {
      id: 99999,
      status: 'released'
    };

    expect(updatePaymentStatus(input)).rejects.toThrow(/Payment with id 99999 not found/i);
  });

  it('should update status without changing transaction_id when not provided', async () => {
    // Create prerequisite data
    const brandUser = await createTestUser('brand', 'brand@test.com');
    const influencerUser = await createTestUser('influencer', 'influencer@test.com');
    const brandProfile = await createTestBrandProfile(brandUser.id);
    const influencerProfile = await createTestInfluencerProfile(influencerUser.id);
    const campaign = await createTestCampaign(brandProfile.id);
    const collaboration = await createTestCollaboration(campaign.id, influencerProfile.id);
    
    // Create payment with initial transaction_id
    const paymentResult = await db.insert(paymentsTable)
      .values({
        collaboration_id: collaboration.id,
        amount: '500',
        platform_commission: '50',
        influencer_payout: '450',
        transaction_id: 'initial_txn_123'
      })
      .returning()
      .execute();

    const payment = paymentResult[0];

    const input: UpdatePaymentStatusInput = {
      id: payment.id,
      status: 'in_escrow'
      // Note: transaction_id not provided
    };

    const result = await updatePaymentStatus(input);

    // Should update status but keep existing transaction_id
    expect(result.status).toEqual('in_escrow');
    expect(result.transaction_id).toEqual('initial_txn_123');
  });
});