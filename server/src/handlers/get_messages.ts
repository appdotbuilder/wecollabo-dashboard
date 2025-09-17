import { db } from '../db';
import { directMessagesTable } from '../db/schema';
import { type GetMessagesInput, type DirectMessage } from '../schema';
import { or, and, eq, desc } from 'drizzle-orm';

export const getMessages = async (input: GetMessagesInput): Promise<DirectMessage[]> => {
  try {
    let query = db.select().from(directMessagesTable);

    if (input.other_user_id) {
      // Return messages between user_id and other_user_id (bidirectional conversation)
      const whereCondition = or(
        and(
          eq(directMessagesTable.sender_id, input.user_id),
          eq(directMessagesTable.recipient_id, input.other_user_id)
        ),
        and(
          eq(directMessagesTable.sender_id, input.other_user_id),
          eq(directMessagesTable.recipient_id, input.user_id)
        )
      );
      
      const results = await query
        .where(whereCondition)
        .orderBy(directMessagesTable.created_at)
        .execute();
      
      return results;
    } else {
      // Return all messages for user_id (both sent and received)
      const whereCondition = or(
        eq(directMessagesTable.sender_id, input.user_id),
        eq(directMessagesTable.recipient_id, input.user_id)
      );

      const results = await query
        .where(whereCondition)
        .orderBy(directMessagesTable.created_at)
        .execute();

      return results;
    }
  } catch (error) {
    console.error('Get messages failed:', error);
    throw error;
  }
};