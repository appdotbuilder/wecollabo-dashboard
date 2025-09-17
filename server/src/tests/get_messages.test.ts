import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, directMessagesTable } from '../db/schema';
import { type GetMessagesInput, type CreateUserInput, type CreateDirectMessageInput } from '../schema';
import { getMessages } from '../handlers/get_messages';

// Helper function to create a test user
const createTestUser = async (email: string, userType: 'brand' | 'influencer') => {
  const userInput: CreateUserInput = {
    email,
    password: 'password123',
    user_type: userType
  };

  const result = await db.insert(usersTable)
    .values(userInput)
    .returning()
    .execute();

  return result[0];
};

// Helper function to create a test message
const createTestMessage = async (senderId: number, recipientId: number, content: string) => {
  const messageInput: CreateDirectMessageInput = {
    sender_id: senderId,
    recipient_id: recipientId,
    content
  };

  const result = await db.insert(directMessagesTable)
    .values(messageInput)
    .returning()
    .execute();

  return result[0];
};

describe('getMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return messages between two specific users', async () => {
    // Create test users
    const user1 = await createTestUser('user1@test.com', 'brand');
    const user2 = await createTestUser('user2@test.com', 'influencer');

    // Create messages between users
    const message1 = await createTestMessage(user1.id, user2.id, 'Hello from user1');
    const message2 = await createTestMessage(user2.id, user1.id, 'Reply from user2');
    const message3 = await createTestMessage(user1.id, user2.id, 'Second message from user1');

    const input: GetMessagesInput = {
      user_id: user1.id,
      other_user_id: user2.id
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(3);
    
    // Should be ordered by created_at (oldest first)
    expect(result[0].id).toEqual(message1.id);
    expect(result[0].content).toEqual('Hello from user1');
    expect(result[0].sender_id).toEqual(user1.id);
    expect(result[0].recipient_id).toEqual(user2.id);

    expect(result[1].id).toEqual(message2.id);
    expect(result[1].content).toEqual('Reply from user2');
    expect(result[1].sender_id).toEqual(user2.id);
    expect(result[1].recipient_id).toEqual(user1.id);

    expect(result[2].id).toEqual(message3.id);
    expect(result[2].content).toEqual('Second message from user1');
    
    // Verify all messages have proper timestamps
    result.forEach(message => {
      expect(message.created_at).toBeInstanceOf(Date);
      expect(message.updated_at).toBeInstanceOf(Date);
      expect(typeof message.is_read).toBe('boolean');
    });
  });

  it('should return all messages for a user when other_user_id is not provided', async () => {
    // Create test users
    const user1 = await createTestUser('user1@test.com', 'brand');
    const user2 = await createTestUser('user2@test.com', 'influencer');
    const user3 = await createTestUser('user3@test.com', 'influencer');

    // Create messages with different users
    await createTestMessage(user1.id, user2.id, 'Message to user2');
    await createTestMessage(user2.id, user1.id, 'Reply from user2');
    await createTestMessage(user1.id, user3.id, 'Message to user3');
    await createTestMessage(user3.id, user1.id, 'Reply from user3');

    const input: GetMessagesInput = {
      user_id: user1.id
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(4);
    
    // All messages should involve user1 as either sender or recipient
    result.forEach(message => {
      const involvedUsers = [message.sender_id, message.recipient_id];
      expect(involvedUsers).toContain(user1.id);
    });

    // Should be ordered by created_at
    for (let i = 1; i < result.length; i++) {
      expect(result[i].created_at >= result[i - 1].created_at).toBe(true);
    }
  });

  it('should return empty array when user has no messages', async () => {
    // Create test users but no messages
    const user1 = await createTestUser('user1@test.com', 'brand');
    const user2 = await createTestUser('user2@test.com', 'influencer');

    const input: GetMessagesInput = {
      user_id: user1.id,
      other_user_id: user2.id
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(0);
  });

  it('should not include messages from unrelated users when filtering by other_user_id', async () => {
    // Create test users
    const user1 = await createTestUser('user1@test.com', 'brand');
    const user2 = await createTestUser('user2@test.com', 'influencer');
    const user3 = await createTestUser('user3@test.com', 'influencer');

    // Create messages between user1 and user2
    await createTestMessage(user1.id, user2.id, 'Message to user2');
    await createTestMessage(user2.id, user1.id, 'Reply from user2');

    // Create messages between user1 and user3 (should not be included)
    await createTestMessage(user1.id, user3.id, 'Message to user3');
    await createTestMessage(user3.id, user1.id, 'Reply from user3');

    const input: GetMessagesInput = {
      user_id: user1.id,
      other_user_id: user2.id
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(2);
    
    // All messages should only involve user1 and user2
    result.forEach(message => {
      const involvedUsers = [message.sender_id, message.recipient_id];
      expect(involvedUsers.sort()).toEqual([user1.id, user2.id].sort());
    });
  });

  it('should handle case when other_user_id does not exist', async () => {
    // Create test user
    const user1 = await createTestUser('user1@test.com', 'brand');

    const input: GetMessagesInput = {
      user_id: user1.id,
      other_user_id: 999999 // Non-existent user ID
    };

    const result = await getMessages(input);

    expect(result).toHaveLength(0);
  });

  it('should handle bidirectional conversation correctly', async () => {
    // Create test users
    const user1 = await createTestUser('user1@test.com', 'brand');
    const user2 = await createTestUser('user2@test.com', 'influencer');

    // Create conversation in both directions
    await createTestMessage(user1.id, user2.id, 'First message from user1');
    await createTestMessage(user2.id, user1.id, 'First reply from user2');
    await createTestMessage(user1.id, user2.id, 'Second message from user1');

    // Query from user1's perspective
    const input1: GetMessagesInput = {
      user_id: user1.id,
      other_user_id: user2.id
    };

    const result1 = await getMessages(input1);

    // Query from user2's perspective - should get the same messages
    const input2: GetMessagesInput = {
      user_id: user2.id,
      other_user_id: user1.id
    };

    const result2 = await getMessages(input2);

    expect(result1).toHaveLength(3);
    expect(result2).toHaveLength(3);
    
    // Both perspectives should return the same conversation
    expect(result1.map(m => m.id).sort()).toEqual(result2.map(m => m.id).sort());
  });
});