import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { 
  usersTable, 
  influencerProfilesTable, 
  brandProfilesTable, 
  campaignsTable,
  collaborationsTable,
  messagesTable 
} from '../db/schema';
import { getCollaborationMessages } from '../handlers/get_collaboration_messages';
import { eq } from 'drizzle-orm';
import type { CreateUserInput, CreateInfluencerProfileInput, CreateBrandProfileInput } from '../schema';

describe('getCollaborationMessages', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  let testCollaborationId: number;
  let testSenderId: number;

  beforeEach(async () => {
    // Create test users
    const influencerUser: CreateUserInput = {
      email: 'influencer@test.com',
      password_hash: 'hash123',
      user_type: 'influencer'
    };

    const brandUser: CreateUserInput = {
      email: 'brand@test.com',
      password_hash: 'hash456',
      user_type: 'brand'
    };

    const [createdInfluencerUser] = await db.insert(usersTable)
      .values(influencerUser)
      .returning()
      .execute();

    const [createdBrandUser] = await db.insert(usersTable)
      .values(brandUser)
      .returning()
      .execute();

    testSenderId = createdInfluencerUser.id;

    // Create influencer profile
    const influencerProfile: CreateInfluencerProfileInput = {
      user_id: createdInfluencerUser.id,
      display_name: 'Test Influencer',
      total_reach: 10000,
      engagement_rate: 3.5
    };

    const [createdInfluencerProfile] = await db.insert(influencerProfilesTable)
      .values({
        ...influencerProfile,
        engagement_rate: influencerProfile.engagement_rate.toString()
      })
      .returning()
      .execute();

    // Create brand profile
    const brandProfile: CreateBrandProfileInput = {
      user_id: createdBrandUser.id,
      company_name: 'Test Brand'
    };

    const [createdBrandProfile] = await db.insert(brandProfilesTable)
      .values(brandProfile)
      .returning()
      .execute();

    // Create campaign
    const [createdCampaign] = await db.insert(campaignsTable)
      .values({
        brand_id: createdBrandProfile.id,
        title: 'Test Campaign',
        description: 'A test campaign',
        budget: '1000.00',
        deliverable_requirements: 'Test requirements',
        start_date: new Date('2024-01-01'),
        end_date: new Date('2024-01-31')
      })
      .returning()
      .execute();

    // Create collaboration
    const [createdCollaboration] = await db.insert(collaborationsTable)
      .values({
        campaign_id: createdCampaign.id,
        influencer_id: createdInfluencerProfile.id,
        agreed_price: '500.00'
      })
      .returning()
      .execute();

    testCollaborationId = createdCollaboration.id;
  });

  it('should return empty array when no messages exist', async () => {
    const result = await getCollaborationMessages(testCollaborationId);
    expect(result).toEqual([]);
  });

  it('should return messages for a collaboration ordered by sent_at', async () => {
    const baseTime = new Date('2024-01-15T10:00:00Z');
    
    // Create multiple messages with different timestamps
    await db.insert(messagesTable)
      .values([
        {
          collaboration_id: testCollaborationId,
          sender_id: testSenderId,
          content: 'Third message',
          message_type: 'text',
          sent_at: new Date(baseTime.getTime() + 2 * 60000) // +2 minutes
        },
        {
          collaboration_id: testCollaborationId,
          sender_id: testSenderId,
          content: 'First message',
          message_type: 'text',
          sent_at: baseTime
        },
        {
          collaboration_id: testCollaborationId,
          sender_id: testSenderId,
          content: 'Second message',
          message_type: 'text',
          sent_at: new Date(baseTime.getTime() + 60000) // +1 minute
        }
      ])
      .execute();

    const result = await getCollaborationMessages(testCollaborationId);

    expect(result).toHaveLength(3);
    expect(result[0].content).toEqual('First message');
    expect(result[1].content).toEqual('Second message');
    expect(result[2].content).toEqual('Third message');
  });

  it('should return messages with correct field types and values', async () => {
    const testMessage = {
      collaboration_id: testCollaborationId,
      sender_id: testSenderId,
      content: 'Test message content',
      message_type: 'text' as const,
      file_url: 'https://example.com/file.jpg',
      sent_at: new Date('2024-01-15T10:00:00Z'),
      read_at: new Date('2024-01-15T10:05:00Z')
    };

    await db.insert(messagesTable)
      .values(testMessage)
      .execute();

    const result = await getCollaborationMessages(testCollaborationId);

    expect(result).toHaveLength(1);
    const message = result[0];
    
    expect(message.collaboration_id).toEqual(testCollaborationId);
    expect(message.sender_id).toEqual(testSenderId);
    expect(message.content).toEqual('Test message content');
    expect(message.message_type).toEqual('text');
    expect(message.file_url).toEqual('https://example.com/file.jpg');
    expect(message.sent_at).toBeInstanceOf(Date);
    expect(message.read_at).toBeInstanceOf(Date);
    expect(message.created_at).toBeInstanceOf(Date);
    expect(message.id).toBeDefined();
  });

  it('should handle messages with null optional fields', async () => {
    await db.insert(messagesTable)
      .values({
        collaboration_id: testCollaborationId,
        sender_id: testSenderId,
        content: 'Message without optional fields',
        message_type: 'text',
        sent_at: new Date('2024-01-15T10:00:00Z')
        // file_url and read_at are null by default
      })
      .execute();

    const result = await getCollaborationMessages(testCollaborationId);

    expect(result).toHaveLength(1);
    const message = result[0];
    
    expect(message.file_url).toBeNull();
    expect(message.read_at).toBeNull();
    expect(message.content).toEqual('Message without optional fields');
  });

  it('should handle different message types', async () => {
    await db.insert(messagesTable)
      .values([
        {
          collaboration_id: testCollaborationId,
          sender_id: testSenderId,
          content: 'Text message',
          message_type: 'text',
          sent_at: new Date('2024-01-15T10:00:00Z')
        },
        {
          collaboration_id: testCollaborationId,
          sender_id: testSenderId,
          content: 'File shared',
          message_type: 'file',
          file_url: 'https://example.com/document.pdf',
          sent_at: new Date('2024-01-15T10:01:00Z')
        },
        {
          collaboration_id: testCollaborationId,
          sender_id: testSenderId,
          content: 'System notification',
          message_type: 'system',
          sent_at: new Date('2024-01-15T10:02:00Z')
        }
      ])
      .execute();

    const result = await getCollaborationMessages(testCollaborationId);

    expect(result).toHaveLength(3);
    expect(result[0].message_type).toEqual('text');
    expect(result[1].message_type).toEqual('file');
    expect(result[1].file_url).toEqual('https://example.com/document.pdf');
    expect(result[2].message_type).toEqual('system');
  });

  it('should not return messages from other collaborations', async () => {
    // Create another collaboration to ensure isolation
    const [anotherUser] = await db.insert(usersTable)
      .values({
        email: 'another@test.com',
        password_hash: 'hash789',
        user_type: 'influencer'
      })
      .returning()
      .execute();

    const [anotherInfluencerProfile] = await db.insert(influencerProfilesTable)
      .values({
        user_id: anotherUser.id,
        display_name: 'Another Influencer',
        total_reach: 5000,
        engagement_rate: '2.5'
      })
      .returning()
      .execute();

    // Get the campaign from our test collaboration
    const collaborations = await db.select()
      .from(collaborationsTable)
      .where(eq(collaborationsTable.id, testCollaborationId))
      .execute();
    
    const campaignId = collaborations[0].campaign_id;

    const [anotherCollaboration] = await db.insert(collaborationsTable)
      .values({
        campaign_id: campaignId,
        influencer_id: anotherInfluencerProfile.id,
        agreed_price: '300.00'
      })
      .returning()
      .execute();

    // Add messages to both collaborations
    await db.insert(messagesTable)
      .values([
        {
          collaboration_id: testCollaborationId,
          sender_id: testSenderId,
          content: 'Message for collaboration 1',
          message_type: 'text',
          sent_at: new Date('2024-01-15T10:00:00Z')
        },
        {
          collaboration_id: anotherCollaboration.id,
          sender_id: anotherUser.id,
          content: 'Message for collaboration 2',
          message_type: 'text',
          sent_at: new Date('2024-01-15T10:00:00Z')
        }
      ])
      .execute();

    const result = await getCollaborationMessages(testCollaborationId);

    expect(result).toHaveLength(1);
    expect(result[0].content).toEqual('Message for collaboration 1');
    expect(result[0].collaboration_id).toEqual(testCollaborationId);
  });

  it('should return empty array for non-existent collaboration', async () => {
    const nonExistentCollaborationId = 99999;
    const result = await getCollaborationMessages(nonExistentCollaborationId);
    expect(result).toEqual([]);
  });
});