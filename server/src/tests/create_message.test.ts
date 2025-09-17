import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, influencerProfilesTable, brandProfilesTable, campaignsTable, collaborationsTable, messagesTable } from '../db/schema';
import { type CreateMessageInput } from '../schema';
import { createMessage } from '../handlers/create_message';
import { eq } from 'drizzle-orm';

// Test data setup
const testUser1 = {
  email: 'influencer@test.com',
  password_hash: 'hash123',
  user_type: 'influencer' as const
};

const testUser2 = {
  email: 'brand@test.com',
  password_hash: 'hash456',
  user_type: 'brand' as const
};

const testUser3 = {
  email: 'unauthorized@test.com',
  password_hash: 'hash789',
  user_type: 'influencer' as const
};

const testInfluencerProfile = {
  display_name: 'Test Influencer',
  bio: 'Test bio',
  profile_image: null,
  total_reach: 1000,
  engagement_rate: 5.5
};

const testBrandProfile = {
  company_name: 'Test Brand',
  company_description: 'Test description',
  logo: null,
  website: null,
  industry: 'Tech'
};

const testCampaign = {
  title: 'Test Campaign',
  description: 'Test campaign description',
  budget: 1000.00,
  deliverable_requirements: 'Test requirements',
  start_date: new Date('2024-01-01'),
  end_date: new Date('2024-12-31')
};

const testCollaboration = {
  agreed_price: 500.00
};

describe('createMessage', () => {
  let userId1: number;
  let userId2: number;
  let userId3: number;
  let influencerProfileId: number;
  let brandProfileId: number;
  let campaignId: number;
  let collaborationId: number;

  beforeEach(async () => {
    await createDB();

    // Create test users
    const users = await db.insert(usersTable)
      .values([testUser1, testUser2, testUser3])
      .returning()
      .execute();
    
    userId1 = users[0].id;
    userId2 = users[1].id;
    userId3 = users[2].id;

    // Create influencer profile
    const influencerProfiles = await db.insert(influencerProfilesTable)
      .values({ 
        ...testInfluencerProfile, 
        user_id: userId1,
        engagement_rate: testInfluencerProfile.engagement_rate.toString()
      })
      .returning()
      .execute();
    
    influencerProfileId = influencerProfiles[0].id;

    // Create brand profile
    const brandProfiles = await db.insert(brandProfilesTable)
      .values({ ...testBrandProfile, user_id: userId2 })
      .returning()
      .execute();
    
    brandProfileId = brandProfiles[0].id;

    // Create campaign
    const campaigns = await db.insert(campaignsTable)
      .values({ 
        ...testCampaign, 
        brand_id: brandProfileId,
        budget: testCampaign.budget.toString()
      })
      .returning()
      .execute();
    
    campaignId = campaigns[0].id;

    // Create collaboration
    const collaborations = await db.insert(collaborationsTable)
      .values({ 
        ...testCollaboration, 
        campaign_id: campaignId, 
        influencer_id: influencerProfileId,
        agreed_price: testCollaboration.agreed_price.toString()
      })
      .returning()
      .execute();
    
    collaborationId = collaborations[0].id;
  });

  afterEach(resetDB);

  it('should create a message from influencer', async () => {
    const testInput: CreateMessageInput = {
      collaboration_id: collaborationId,
      sender_id: userId1,
      content: 'Hello from influencer',
      message_type: 'text'
    };

    const result = await createMessage(testInput);

    expect(result.collaboration_id).toEqual(collaborationId);
    expect(result.sender_id).toEqual(userId1);
    expect(result.content).toEqual('Hello from influencer');
    expect(result.message_type).toEqual('text');
    expect(result.file_url).toBeNull();
    expect(result.id).toBeDefined();
    expect(result.sent_at).toBeInstanceOf(Date);
    expect(result.read_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
  });

  it('should create a message from brand user', async () => {
    const testInput: CreateMessageInput = {
      collaboration_id: collaborationId,
      sender_id: userId2,
      content: 'Hello from brand',
      message_type: 'text'
    };

    const result = await createMessage(testInput);

    expect(result.collaboration_id).toEqual(collaborationId);
    expect(result.sender_id).toEqual(userId2);
    expect(result.content).toEqual('Hello from brand');
    expect(result.message_type).toEqual('text');
    expect(result.id).toBeDefined();
  });

  it('should create a file message', async () => {
    const testInput: CreateMessageInput = {
      collaboration_id: collaborationId,
      sender_id: userId1,
      content: 'Here is the file',
      message_type: 'file',
      file_url: 'https://example.com/file.pdf'
    };

    const result = await createMessage(testInput);

    expect(result.message_type).toEqual('file');
    expect(result.file_url).toEqual('https://example.com/file.pdf');
    expect(result.content).toEqual('Here is the file');
  });

  it('should create a system message', async () => {
    const testInput: CreateMessageInput = {
      collaboration_id: collaborationId,
      sender_id: userId1,
      content: 'Collaboration started',
      message_type: 'system'
    };

    const result = await createMessage(testInput);

    expect(result.message_type).toEqual('system');
    expect(result.content).toEqual('Collaboration started');
  });

  it('should save message to database', async () => {
    const testInput: CreateMessageInput = {
      collaboration_id: collaborationId,
      sender_id: userId1,
      content: 'Test message',
      message_type: 'text'
    };

    const result = await createMessage(testInput);

    const messages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.id, result.id))
      .execute();

    expect(messages).toHaveLength(1);
    expect(messages[0].content).toEqual('Test message');
    expect(messages[0].collaboration_id).toEqual(collaborationId);
    expect(messages[0].sender_id).toEqual(userId1);
    expect(messages[0].sent_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent collaboration', async () => {
    const testInput: CreateMessageInput = {
      collaboration_id: 99999,
      sender_id: userId1,
      content: 'Test message',
      message_type: 'text'
    };

    await expect(createMessage(testInput)).rejects.toThrow(/collaboration not found/i);
  });

  it('should throw error for unauthorized sender', async () => {
    const testInput: CreateMessageInput = {
      collaboration_id: collaborationId,
      sender_id: userId3, // This user is not part of the collaboration
      content: 'Unauthorized message',
      message_type: 'text'
    };

    await expect(createMessage(testInput)).rejects.toThrow(/not authorized to send messages/i);
  });

  it('should handle messages without file_url', async () => {
    const testInput: CreateMessageInput = {
      collaboration_id: collaborationId,
      sender_id: userId1,
      content: 'Simple text message',
      message_type: 'text'
      // file_url is optional and not provided
    };

    const result = await createMessage(testInput);

    expect(result.file_url).toBeNull();
    expect(result.content).toEqual('Simple text message');
  });

  it('should create multiple messages in sequence', async () => {
    const message1: CreateMessageInput = {
      collaboration_id: collaborationId,
      sender_id: userId1,
      content: 'First message',
      message_type: 'text'
    };

    const message2: CreateMessageInput = {
      collaboration_id: collaborationId,
      sender_id: userId2,
      content: 'Second message',
      message_type: 'text'
    };

    const result1 = await createMessage(message1);
    const result2 = await createMessage(message2);

    expect(result1.id).not.toEqual(result2.id);
    expect(result1.sender_id).toEqual(userId1);
    expect(result2.sender_id).toEqual(userId2);

    // Verify both are in database
    const allMessages = await db.select()
      .from(messagesTable)
      .where(eq(messagesTable.collaboration_id, collaborationId))
      .execute();

    expect(allMessages).toHaveLength(2);
  });
});