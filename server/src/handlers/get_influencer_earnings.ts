import { db } from '../db';
import { paymentsTable, collaborationsTable } from '../db/schema';
import { type Payment } from '../schema';
import { eq } from 'drizzle-orm';

export async function getInfluencerEarnings(influencerId: number): Promise<Payment[]> {
  try {
    // Join payments with collaborations to filter by influencer_id
    const results = await db.select()
      .from(paymentsTable)
      .innerJoin(
        collaborationsTable,
        eq(paymentsTable.collaboration_id, collaborationsTable.id)
      )
      .where(eq(collaborationsTable.influencer_id, influencerId))
      .execute();

    // Map the joined results to Payment objects with proper numeric conversions
    return results.map(result => ({
      id: result.payments.id,
      collaboration_id: result.payments.collaboration_id,
      amount: parseFloat(result.payments.amount),
      platform_commission: parseFloat(result.payments.platform_commission),
      influencer_payout: parseFloat(result.payments.influencer_payout),
      status: result.payments.status,
      transaction_id: result.payments.transaction_id,
      created_at: result.payments.created_at,
      updated_at: result.payments.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch influencer earnings:', error);
    throw error;
  }
}