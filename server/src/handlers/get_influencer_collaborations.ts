import { db } from '../db';
import { collaborationsTable, campaignsTable, brandProfilesTable } from '../db/schema';
import { type Collaboration } from '../schema';
import { eq } from 'drizzle-orm';

export const getInfluencerCollaborations = async (influencerId: number): Promise<Collaboration[]> => {
  try {
    // Query collaborations with campaign and brand details
    const results = await db.select()
      .from(collaborationsTable)
      .innerJoin(campaignsTable, eq(collaborationsTable.campaign_id, campaignsTable.id))
      .innerJoin(brandProfilesTable, eq(campaignsTable.brand_id, brandProfilesTable.id))
      .where(eq(collaborationsTable.influencer_id, influencerId))
      .execute();

    // Transform results to return proper Collaboration objects with numeric conversions
    return results.map(result => ({
      ...result.collaborations,
      agreed_price: parseFloat(result.collaborations.agreed_price) // Convert numeric field to number
    }));
  } catch (error) {
    console.error('Failed to fetch influencer collaborations:', error);
    throw error;
  }
};