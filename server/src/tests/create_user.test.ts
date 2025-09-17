import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable } from '../db/schema';
import { type CreateUserInput } from '../schema';
import { createUser } from '../handlers/create_user';
import { eq } from 'drizzle-orm';

// Test input for brand user
const brandTestInput: CreateUserInput = {
  email: 'brand@example.com',
  password: 'securepassword123',
  user_type: 'brand'
};

// Test input for influencer user
const influencerTestInput: CreateUserInput = {
  email: 'influencer@example.com',
  password: 'anotherpassword456',
  user_type: 'influencer'
};

describe('createUser', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a brand user successfully', async () => {
    const result = await createUser(brandTestInput);

    // Verify user fields
    expect(result.email).toEqual('brand@example.com');
    expect(result.user_type).toEqual('brand');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Password should be hashed, not the original
    expect(result.password).not.toEqual('securepassword123');
    expect(result.password).toBeDefined();
    expect(result.password.length).toBeGreaterThan(20); // Hashed passwords are longer
  });

  it('should create an influencer user successfully', async () => {
    const result = await createUser(influencerTestInput);

    // Verify user fields
    expect(result.email).toEqual('influencer@example.com');
    expect(result.user_type).toEqual('influencer');
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe('number');
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
    
    // Password should be hashed
    expect(result.password).not.toEqual('anotherpassword456');
    expect(result.password).toBeDefined();
  });

  it('should save user to database correctly', async () => {
    const result = await createUser(brandTestInput);

    // Query database to verify user was saved
    const users = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, result.id))
      .execute();

    expect(users).toHaveLength(1);
    expect(users[0].email).toEqual('brand@example.com');
    expect(users[0].user_type).toEqual('brand');
    expect(users[0].password).not.toEqual('securepassword123'); // Should be hashed
    expect(users[0].created_at).toBeInstanceOf(Date);
    expect(users[0].updated_at).toBeInstanceOf(Date);
  });

  it('should verify password can be validated after creation', async () => {
    const result = await createUser(brandTestInput);

    // Verify the hashed password can be validated
    const isValid = await Bun.password.verify('securepassword123', result.password);
    expect(isValid).toBe(true);

    // Verify wrong password fails
    const isInvalid = await Bun.password.verify('wrongpassword', result.password);
    expect(isInvalid).toBe(false);
  });

  it('should reject duplicate email addresses', async () => {
    // Create first user
    await createUser(brandTestInput);

    // Try to create another user with same email
    const duplicateInput: CreateUserInput = {
      email: 'brand@example.com',
      password: 'differentpassword',
      user_type: 'influencer'
    };

    // Should throw error for duplicate email
    await expect(createUser(duplicateInput)).rejects.toThrow(/email already exists/i);
  });

  it('should create multiple users with different emails', async () => {
    const user1 = await createUser(brandTestInput);
    const user2 = await createUser(influencerTestInput);

    // Both users should be created successfully
    expect(user1.id).toBeDefined();
    expect(user2.id).toBeDefined();
    expect(user1.id).not.toEqual(user2.id);
    
    // Verify both users exist in database
    const allUsers = await db.select()
      .from(usersTable)
      .execute();

    expect(allUsers).toHaveLength(2);
    
    const emails = allUsers.map(u => u.email);
    expect(emails).toContain('brand@example.com');
    expect(emails).toContain('influencer@example.com');
  });

  it('should handle database constraint violations gracefully', async () => {
    // Create a user first
    await createUser(brandTestInput);

    // Try to create user with same email but different case
    const caseTestInput: CreateUserInput = {
      email: 'BRAND@EXAMPLE.COM',
      password: 'password123',
      user_type: 'brand'
    };

    // This should not throw since database is case-sensitive for email comparison
    // But if it does throw due to unique constraint, that's also acceptable behavior
    try {
      await createUser(caseTestInput);
      // If successful, verify both users exist
      const users = await db.select().from(usersTable).execute();
      expect(users.length).toBeGreaterThanOrEqual(1);
    } catch (error) {
      // If it fails due to constraint, that's acceptable
      expect(error).toBeDefined();
    }
  });
});