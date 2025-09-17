import { db } from '../db';
import { campaignsTable } from '../db/schema';
import { type Campaign } from '../schema';
import { eq } from 'drizzle-orm';

export async function getBrandCampaigns(brandId: number): Promise<Campaign[]> {
  try {
    const results = await db.select()
      .from(campaignsTable)
      .where(eq(campaignsTable.brand_id, brandId))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(campaign => ({
      ...campaign,
      budget: parseFloat(campaign.budget) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch brand campaigns:', error);
    throw error;
  }
}