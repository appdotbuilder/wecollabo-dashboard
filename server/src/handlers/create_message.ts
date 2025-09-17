import { db } from '../db';
import { messagesTable, collaborationsTable, influencerProfilesTable, brandProfilesTable, campaignsTable, usersTable } from '../db/schema';
import { type CreateMessageInput, type Message } from '../schema';
import { eq, or, and } from 'drizzle-orm';

export const createMessage = async (input: CreateMessageInput): Promise<Message> => {
  try {
    // First, verify that the collaboration exists
    const collaboration = await db.select()
      .from(collaborationsTable)
      .where(eq(collaborationsTable.id, input.collaboration_id))
      .execute();

    if (collaboration.length === 0) {
      throw new Error('Collaboration not found');
    }

    // Verify that the sender is part of this collaboration
    // The sender must be either the influencer in the collaboration or a user associated with the brand
    const collaborationData = collaboration[0];

    // Get the influencer's user_id from the collaboration
    const influencerProfile = await db.select({ user_id: influencerProfilesTable.user_id })
      .from(influencerProfilesTable)
      .where(eq(influencerProfilesTable.id, collaborationData.influencer_id))
      .execute();

    if (influencerProfile.length === 0) {
      throw new Error('Influencer profile not found');
    }

    // Get the brand's user_id from the collaboration via campaign
    const brandProfile = await db.select({ user_id: brandProfilesTable.user_id })
      .from(brandProfilesTable)
      .innerJoin(campaignsTable, eq(brandProfilesTable.id, campaignsTable.brand_id))
      .where(eq(campaignsTable.id, collaborationData.campaign_id))
      .execute();

    const validSenderIds = [influencerProfile[0].user_id];
    
    if (brandProfile.length > 0) {
      validSenderIds.push(brandProfile[0].user_id);
    }

    if (!validSenderIds.includes(input.sender_id)) {
      throw new Error('Sender is not authorized to send messages in this collaboration');
    }

    // Insert the message
    const result = await db.insert(messagesTable)
      .values({
        collaboration_id: input.collaboration_id,
        sender_id: input.sender_id,
        content: input.content,
        message_type: input.message_type,
        file_url: input.file_url || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Message creation failed:', error);
    throw error;
  }
};