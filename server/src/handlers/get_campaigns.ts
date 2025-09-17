import { db } from '../db';
import { campaignsTable } from '../db/schema';
import { type Campaign } from '../schema';
import { eq } from 'drizzle-orm';

export const getCampaigns = async (): Promise<Campaign[]> => {
  try {
    // Fetch all active campaigns from the database
    const results = await db.select()
      .from(campaignsTable)
      .where(eq(campaignsTable.status, 'active'))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(campaign => ({
      ...campaign,
      budget: parseFloat(campaign.budget)
    }));
  } catch (error) {
    console.error('Failed to fetch campaigns:', error);
    throw error;
  }
};