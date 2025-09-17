import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { directMessagesTable, usersTable } from '../db/schema';
import { type CreateDirectMessageInput } from '../schema';
import { sendMessage } from '../handlers/send_message';
import { eq } from 'drizzle-orm';

describe('sendMessage', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let senderId: number;
  let recipientId: number;

  beforeEach(async () => {
    // Create test users
    const users = await db.insert(usersTable)
      .values([
        {
          email: 'sender@test.com',
          password: 'password123',
          user_type: 'brand'
        },
        {
          email: 'recipient@test.com',
          password: 'password123',
          user_type: 'influencer'
        }
      ])
      .returning()
      .execute();

    senderId = users[0].id;
    recipientId = users[1].id;
  });

  const testInput: CreateDirectMessageInput = {
    sender_id: 0, // Will be set in each test
    recipient_id: 0, // Will be set in each test
    content: 'Hello, this is a test message!'
  };

  it('should send a message successfully', async () => {
    const input = {
      ...testInput,
      sender_id: senderId,
      recipient_id: recipientId
    };

    const result = await sendMessage(input);

    // Validate message properties
    expect(result.id).toBeDefined();
    expect(result.sender_id).toEqual(senderId);
    expect(result.recipient_id).toEqual(recipientId);
    expect(result.content).toEqual('Hello, this is a test message!');
    expect(result.is_read).toEqual(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save message to database', async () => {
    const input = {
      ...testInput,
      sender_id: senderId,
      recipient_id: recipientId
    };

    const result = await sendMessage(input);

    // Query the database to verify message was saved
    const messages = await db.select()
      .from(directMessagesTable)
      .where(eq(directMessagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].sender_id).toEqual(senderId);
    expect(messages[0].recipient_id).toEqual(recipientId);
    expect(messages[0].content).toEqual('Hello, this is a test message!');
    expect(messages[0].is_read).toEqual(false);
    expect(messages[0].created_at).toBeInstanceOf(Date);
    expect(messages[0].updated_at).toBeInstanceOf(Date);
  });

  it('should throw error when sender does not exist', async () => {
    const input = {
      ...testInput,
      sender_id: 99999, // Non-existent user ID
      recipient_id: recipientId
    };

    await expect(sendMessage(input)).rejects.toThrow(/sender user not found/i);
  });

  it('should throw error when recipient does not exist', async () => {
    const input = {
      ...testInput,
      sender_id: senderId,
      recipient_id: 99999 // Non-existent user ID
    };

    await expect(sendMessage(input)).rejects.toThrow(/recipient user not found/i);
  });

  it('should throw error when both sender and recipient do not exist', async () => {
    const input = {
      ...testInput,
      sender_id: 99998, // Non-existent user ID
      recipient_id: 99999 // Non-existent user ID
    };

    await expect(sendMessage(input)).rejects.toThrow(/sender user not found/i);
  });

  it('should handle empty message content', async () => {
    const input = {
      sender_id: senderId,
      recipient_id: recipientId,
      content: '' // Empty content
    };

    const result = await sendMessage(input);

    expect(result.content).toEqual('');
    expect(result.sender_id).toEqual(senderId);
    expect(result.recipient_id).toEqual(recipientId);
  });

  it('should handle long message content', async () => {
    const longContent = 'A'.repeat(1000); // 1000 character message
    const input = {
      sender_id: senderId,
      recipient_id: recipientId,
      content: longContent
    };

    const result = await sendMessage(input);

    expect(result.content).toEqual(longContent);
    expect(result.content.length).toEqual(1000);
  });

  it('should allow user to send message to themselves', async () => {
    const input = {
      sender_id: senderId,
      recipient_id: senderId, // Same as sender
      content: 'Note to self'
    };

    const result = await sendMessage(input);

    expect(result.sender_id).toEqual(senderId);
    expect(result.recipient_id).toEqual(senderId);
    expect(result.content).toEqual('Note to self');
  });

  it('should handle special characters in content', async () => {
    const specialContent = 'Hello! 🎉 This has émojis & spëcial chars: @#$%^&*()';
    const input = {
      sender_id: senderId,
      recipient_id: recipientId,
      content: specialContent
    };

    const result = await sendMessage(input);

    expect(result.content).toEqual(specialContent);

    // Verify in database
    const messages = await db.select()
      .from(directMessagesTable)
      .where(eq(directMessagesTable.id, result.id))
      .execute();

    expect(messages[0].content).toEqual(specialContent);
  });
});