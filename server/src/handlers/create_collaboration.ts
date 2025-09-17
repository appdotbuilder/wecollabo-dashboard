import { db } from '../db';
import { collaborationsTable, campaignsTable, influencerProfilesTable } from '../db/schema';
import { type CreateCollaborationInput, type Collaboration } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createCollaboration = async (input: CreateCollaborationInput): Promise<Collaboration> => {
  try {
    // Validate that the campaign exists and is active
    const campaign = await db.select()
      .from(campaignsTable)
      .where(eq(campaignsTable.id, input.campaign_id))
      .execute();

    if (campaign.length === 0) {
      throw new Error('Campaign not found');
    }

    if (campaign[0].status !== 'active') {
      throw new Error('Campaign is not active');
    }

    // Validate that the influencer profile exists
    const influencer = await db.select()
      .from(influencerProfilesTable)
      .where(eq(influencerProfilesTable.id, input.influencer_id))
      .execute();

    if (influencer.length === 0) {
      throw new Error('Influencer profile not found');
    }

    // Check if collaboration already exists for this campaign-influencer pair
    const existingCollaboration = await db.select()
      .from(collaborationsTable)
      .where(and(
        eq(collaborationsTable.campaign_id, input.campaign_id),
        eq(collaborationsTable.influencer_id, input.influencer_id)
      ))
      .execute();

    if (existingCollaboration.length > 0) {
      throw new Error('Collaboration already exists for this campaign and influencer');
    }

    // Insert collaboration record
    const result = await db.insert(collaborationsTable)
      .values({
        campaign_id: input.campaign_id,
        influencer_id: input.influencer_id,
        agreed_price: input.agreed_price.toString() // Convert number to string for numeric column
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const collaboration = result[0];
    return {
      ...collaboration,
      agreed_price: parseFloat(collaboration.agreed_price) // Convert string back to number
    };
  } catch (error) {
    console.error('Collaboration creation failed:', error);
    throw error;
  }
};