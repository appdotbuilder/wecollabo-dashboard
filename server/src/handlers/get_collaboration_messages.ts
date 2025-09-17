import { db } from '../db';
import { messagesTable } from '../db/schema';
import { type Message } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getCollaborationMessages(collaborationId: number): Promise<Message[]> {
  try {
    const results = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.collaboration_id, collaborationId))
      .orderBy(asc(messagesTable.sent_at))
      .execute();

    return results.map(message => ({
      ...message,
      // Convert timestamp fields to Date objects and handle nullable dates
      sent_at: new Date(message.sent_at),
      read_at: message.read_at ? new Date(message.read_at) : null,
      created_at: new Date(message.created_at)
    }));
  } catch (error) {
    console.error('Failed to fetch collaboration messages:', error);
    throw error;
  }
}