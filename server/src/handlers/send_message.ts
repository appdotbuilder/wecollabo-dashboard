import { db } from '../db';
import { directMessagesTable, usersTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateDirectMessageInput, type DirectMessage } from '../schema';

export const sendMessage = async (input: CreateDirectMessageInput): Promise<DirectMessage> => {
  try {
    // Validate that sender exists
    const senderExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.sender_id))
      .limit(1)
      .execute();

    if (senderExists.length === 0) {
      throw new Error('Sender user not found');
    }

    // Validate that recipient exists
    const recipientExists = await db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.id, input.recipient_id))
      .limit(1)
      .execute();

    if (recipientExists.length === 0) {
      throw new Error('Recipient user not found');
    }

    // Insert the direct message
    const result = await db.insert(directMessagesTable)
      .values({
        sender_id: input.sender_id,
        recipient_id: input.recipient_id,
        content: input.content,
        is_read: false // Default value
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Message sending failed:', error);
    throw error;
  }
};