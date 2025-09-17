import { db } from '../db';
import { disputesTable, collaborationsTable, campaignsTable, influencerProfilesTable, brandProfilesTable } from '../db/schema';
import { type CreateDisputeInput, type Dispute } from '../schema';
import { eq, and, or } from 'drizzle-orm';

export const createDispute = async (input: CreateDisputeInput): Promise<Dispute> => {
  try {
    // First, verify that the collaboration exists and get related information
    const collaborationResult = await db.select({
      collaboration_id: collaborationsTable.id,
      campaign_id: collaborationsTable.campaign_id,
      influencer_id: collaborationsTable.influencer_id,
      brand_id: campaignsTable.brand_id,
      influencer_user_id: influencerProfilesTable.user_id,
      brand_user_id: brandProfilesTable.user_id
    })
      .from(collaborationsTable)
      .innerJoin(campaignsTable, eq(collaborationsTable.campaign_id, campaignsTable.id))
      .innerJoin(influencerProfilesTable, eq(collaborationsTable.influencer_id, influencerProfilesTable.id))
      .innerJoin(brandProfilesTable, eq(campaignsTable.brand_id, brandProfilesTable.id))
      .where(eq(collaborationsTable.id, input.collaboration_id))
      .execute();

    if (collaborationResult.length === 0) {
      throw new Error('Collaboration not found');
    }

    const collaboration = collaborationResult[0];

    // Verify that the user initiating the dispute is authorized (either the brand or influencer involved)
    const authorizedUserIds = [collaboration.influencer_user_id, collaboration.brand_user_id];
    if (!authorizedUserIds.includes(input.initiated_by)) {
      throw new Error('User is not authorized to create a dispute for this collaboration');
    }

    // Insert the dispute record
    const result = await db.insert(disputesTable)
      .values({
        collaboration_id: input.collaboration_id,
        initiated_by: input.initiated_by,
        subject: input.subject,
        description: input.description
        // status defaults to 'open' per schema
        // resolution and resolved_at default to null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Dispute creation failed:', error);
    throw error;
  }
};