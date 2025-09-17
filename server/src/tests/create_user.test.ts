import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input data
const testInfluencerInput: CreateUserInput = {
  email: 'influencer@test.com',
  password_hash: 'hashed_password_123',
  user_type: 'influencer'
};

const testBrandInput: CreateUserInput = {
  email: 'brand@test.com',
  password_hash: 'hashed_password_456',
  user_type: 'brand'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an influencer user', async () => {
    const result = await createUser(testInfluencerInput);

    // Basic field validation
    expect(result.email).toEqual('influencer@test.com');
    expect(result.password_hash).toEqual('hashed_password_123');
    expect(result.user_type).toEqual('influencer');
    expect(result.is_verified).toEqual(false);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should create a brand user', async () => {
    const result = await createUser(testBrandInput);

    // Basic field validation
    expect(result.email).toEqual('brand@test.com');
    expect(result.password_hash).toEqual('hashed_password_456');
    expect(result.user_type).toEqual('brand');
    expect(result.is_verified).toEqual(false);
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save user to database', async () => {
    const result = await createUser(testInfluencerInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('influencer@test.com');
    expect(users[0].password_hash).toEqual('hashed_password_123');
    expect(users[0].user_type).toEqual('influencer');
    expect(users[0].is_verified).toEqual(false);
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should set default values correctly', async () => {
    const result = await createUser(testBrandInput);

    // Verify default values are applied
    expect(result.is_verified).toEqual(false);
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Verify timestamps are recent (within last 10 seconds)
    const now = new Date();
    const tenSecondsAgo = new Date(now.getTime() - 10000);
    expect(result.created_at >= tenSecondsAgo).toBe(true);
    expect(result.updated_at >= tenSecondsAgo).toBe(true);
  });

  it('should generate unique IDs for multiple users', async () => {
    const user1 = await createUser({
      email: 'user1@test.com',
      password_hash: 'hash1',
      user_type: 'influencer'
    });

    const user2 = await createUser({
      email: 'user2@test.com',
      password_hash: 'hash2',
      user_type: 'brand'
    });

    expect(user1.id).not.toEqual(user2.id);
    expect(typeof user1.id).toBe('number');
    expect(typeof user2.id).toBe('number');
  });

  it('should handle duplicate email constraint violation', async () => {
    // Create first user
    await createUser(testInfluencerInput);

    // Attempt to create user with same email should fail
    await expect(createUser({
      email: 'influencer@test.com', // Same email
      password_hash: 'different_hash',
      user_type: 'brand'
    })).rejects.toThrow(/duplicate key value violates unique constraint|UNIQUE constraint failed/i);
  });

  it('should create users with different user types', async () => {
    const influencer = await createUser({
      email: 'inf@test.com',
      password_hash: 'hash1',
      user_type: 'influencer'
    });

    const brand = await createUser({
      email: 'brand@test.com',
      password_hash: 'hash2',
      user_type: 'brand'
    });

    expect(influencer.user_type).toEqual('influencer');
    expect(brand.user_type).toEqual('brand');
    expect(influencer.id).not.toEqual(brand.id);
  });
});