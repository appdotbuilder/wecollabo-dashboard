import { db } from '../db';
import { directMessagesTable } from '../db/schema';
import { type MarkMessageAsReadInput, type DirectMessage } from '../schema';
import { eq, and } from 'drizzle-orm';

export const markMessageAsRead = async (input: MarkMessageAsReadInput): Promise<DirectMessage> => {
  try {
    // Update the message, but only if the user_id is the recipient
    const result = await db.update(directMessagesTable)
      .set({
        is_read: true,
        updated_at: new Date()
      })
      .where(
        and(
          eq(directMessagesTable.id, input.message_id),
          eq(directMessagesTable.recipient_id, input.user_id)
        )
      )
      .returning()
      .execute();

    // If no message was updated, it means either the message doesn't exist
    // or the user is not the recipient
    if (result.length === 0) {
      throw new Error('Message not found or user is not the recipient');
    }

    return result[0];
  } catch (error) {
    console.error('Mark message as read failed:', error);
    throw error;
  }
};