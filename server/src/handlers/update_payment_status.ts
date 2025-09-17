import { db } from '../db';
import { paymentsTable } from '../db/schema';
import { type UpdatePaymentStatusInput, type Payment } from '../schema';
import { eq } from 'drizzle-orm';

export const updatePaymentStatus = async (input: UpdatePaymentStatusInput): Promise<Payment> => {
  try {
    // Update payment status and transaction_id if provided
    const updateData: any = {
      status: input.status,
      updated_at: new Date()
    };

    // Only update transaction_id if it's provided in the input
    if (input.transaction_id !== undefined) {
      updateData.transaction_id = input.transaction_id;
    }

    const result = await db.update(paymentsTable)
      .set(updateData)
      .where(eq(paymentsTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Payment with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const payment = result[0];
    return {
      ...payment,
      amount: parseFloat(payment.amount),
      platform_commission: parseFloat(payment.platform_commission),
      influencer_payout: parseFloat(payment.influencer_payout)
    };
  } catch (error) {
    console.error('Payment status update failed:', error);
    throw error;
  }
};