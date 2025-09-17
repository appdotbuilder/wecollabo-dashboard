import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, directMessagesTable } from '../db/schema';
import { type MarkMessageAsReadInput } from '../schema';
import { markMessageAsRead } from '../handlers/mark_message_as_read';
import { eq } from 'drizzle-orm';

// Test users data
const testSender = {
  email: 'sender@example.com',
  password: 'password123',
  user_type: 'brand' as const
};

const testRecipient = {
  email: 'recipient@example.com', 
  password: 'password123',
  user_type: 'influencer' as const
};

describe('markMessageAsRead', () => {
  let senderId: number;
  let recipientId: number;
  let messageId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const users = await db.insert(usersTable)
      .values([testSender, testRecipient])
      .returning()
      .execute();

    senderId = users[0].id;
    recipientId = users[1].id;

    // Create a test message
    const messages = await db.insert(directMessagesTable)
      .values({
        sender_id: senderId,
        recipient_id: recipientId,
        content: 'Test message',
        is_read: false
      })
      .returning()
      .execute();

    messageId = messages[0].id;
  });

  afterEach(resetDB);

  it('should mark message as read for valid recipient', async () => {
    const input: MarkMessageAsReadInput = {
      message_id: messageId,
      user_id: recipientId
    };

    const result = await markMessageAsRead(input);

    // Verify the returned message is marked as read
    expect(result.id).toEqual(messageId);
    expect(result.sender_id).toEqual(senderId);
    expect(result.recipient_id).toEqual(recipientId);
    expect(result.content).toEqual('Test message');
    expect(result.is_read).toBe(true);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should update message in database', async () => {
    const input: MarkMessageAsReadInput = {
      message_id: messageId,
      user_id: recipientId
    };

    await markMessageAsRead(input);

    // Verify the message was updated in the database
    const messages = await db.select()
      .from(directMessagesTable)
      .where(eq(directMessagesTable.id, messageId))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].is_read).toBe(true);
    expect(messages[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when message does not exist', async () => {
    const input: MarkMessageAsReadInput = {
      message_id: 999999, // Non-existent message ID
      user_id: recipientId
    };

    await expect(markMessageAsRead(input)).rejects.toThrow(/message not found or user is not the recipient/i);
  });

  it('should throw error when user is not the recipient', async () => {
    const input: MarkMessageAsReadInput = {
      message_id: messageId,
      user_id: senderId // Sender trying to mark their own sent message as read
    };

    await expect(markMessageAsRead(input)).rejects.toThrow(/message not found or user is not the recipient/i);
  });

  it('should throw error when user does not exist', async () => {
    const input: MarkMessageAsReadInput = {
      message_id: messageId,
      user_id: 999999 // Non-existent user ID
    };

    await expect(markMessageAsRead(input)).rejects.toThrow(/message not found or user is not the recipient/i);
  });

  it('should handle already read message', async () => {
    // First, mark the message as read
    await db.update(directMessagesTable)
      .set({ is_read: true })
      .where(eq(directMessagesTable.id, messageId))
      .execute();

    const input: MarkMessageAsReadInput = {
      message_id: messageId,
      user_id: recipientId
    };

    const result = await markMessageAsRead(input);

    // Should still work and return the message
    expect(result.is_read).toBe(true);
    expect(result.id).toEqual(messageId);
  });

  it('should create different messages for different users', async () => {
    // Create another user
    const anotherUser = await db.insert(usersTable)
      .values({
        email: 'another@example.com',
        password: 'password123',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const anotherUserId = anotherUser[0].id;

    // Create message to the other user
    const anotherMessage = await db.insert(directMessagesTable)
      .values({
        sender_id: senderId,
        recipient_id: anotherUserId,
        content: 'Message to another user',
        is_read: false
      })
      .returning()
      .execute();

    const anotherMessageId = anotherMessage[0].id;

    // Mark original message as read
    const input1: MarkMessageAsReadInput = {
      message_id: messageId,
      user_id: recipientId
    };

    await markMessageAsRead(input1);

    // Try to mark the other user's message with wrong recipient
    const input2: MarkMessageAsReadInput = {
      message_id: anotherMessageId,
      user_id: recipientId // Wrong recipient
    };

    await expect(markMessageAsRead(input2)).rejects.toThrow(/message not found or user is not the recipient/i);

    // Verify original message is still read, other message is still unread
    const messages = await db.select()
      .from(directMessagesTable)
      .execute();

    const originalMessage = messages.find(m => m.id === messageId);
    const otherMessage = messages.find(m => m.id === anotherMessageId);

    expect(originalMessage?.is_read).toBe(true);
    expect(otherMessage?.is_read).toBe(false);
  });
});