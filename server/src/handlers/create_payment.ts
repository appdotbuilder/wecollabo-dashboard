import { db } from '../db';
import { paymentsTable, collaborationsTable } from '../db/schema';
import { type CreatePaymentInput, type Payment } from '../schema';
import { eq } from 'drizzle-orm';

export const createPayment = async (input: CreatePaymentInput): Promise<Payment> => {
  try {
    // Validate that the collaboration exists
    const collaboration = await db.select()
      .from(collaborationsTable)
      .where(eq(collaborationsTable.id, input.collaboration_id))
      .execute();

    if (collaboration.length === 0) {
      throw new Error(`Collaboration with ID ${input.collaboration_id} not found`);
    }

    // Insert payment record
    const result = await db.insert(paymentsTable)
      .values({
        collaboration_id: input.collaboration_id,
        amount: input.amount.toString(), // Convert number to string for numeric column
        platform_commission: input.platform_commission.toString(),
        influencer_payout: input.influencer_payout.toString()
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const payment = result[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount),
      platform_commission: parseFloat(payment.platform_commission),
      influencer_payout: parseFloat(payment.influencer_payout)
    };
  } catch (error) {
    console.error('Payment creation failed:', error);
    throw error;
  }
};