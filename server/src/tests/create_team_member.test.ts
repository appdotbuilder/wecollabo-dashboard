import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, brandProfilesTable, teamMembersTable } from '../db/schema';
import { type CreateTeamMemberInput } from '../schema';
import { createTeamMember } from '../handlers/create_team_member';
import { eq, and } from 'drizzle-orm';

describe('createTeamMember', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create a team member successfully', async () => {
    // Create prerequisite user
    const user = await db.insert(usersTable)
      .values({
        email: 'teammember@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create prerequisite brand user
    const brandUser = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create brand profile
    const brandProfile = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser[0].id,
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    const testInput: CreateTeamMemberInput = {
      brand_id: brandProfile[0].id,
      user_id: user[0].id,
      role: 'manager'
    };

    const result = await createTeamMember(testInput);

    // Basic field validation
    expect(result.brand_id).toEqual(brandProfile[0].id);
    expect(result.user_id).toEqual(user[0].id);
    expect(result.role).toEqual('manager');
    expect(result.id).toBeDefined();
    expect(result.invited_at).toBeInstanceOf(Date);
    expect(result.joined_at).toBeNull();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should save team member to database', async () => {
    // Create prerequisite user
    const user = await db.insert(usersTable)
      .values({
        email: 'teammember@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create prerequisite brand user
    const brandUser = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create brand profile
    const brandProfile = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser[0].id,
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    const testInput: CreateTeamMemberInput = {
      brand_id: brandProfile[0].id,
      user_id: user[0].id,
      role: 'admin'
    };

    const result = await createTeamMember(testInput);

    // Query the database to verify the team member was saved
    const teamMembers = await db.select()
      .from(teamMembersTable)
      .where(eq(teamMembersTable.id, result.id))
      .execute();

    expect(teamMembers).toHaveLength(1);
    expect(teamMembers[0].brand_id).toEqual(brandProfile[0].id);
    expect(teamMembers[0].user_id).toEqual(user[0].id);
    expect(teamMembers[0].role).toEqual('admin');
    expect(teamMembers[0].invited_at).toBeInstanceOf(Date);
    expect(teamMembers[0].joined_at).toBeNull();
    expect(teamMembers[0].created_at).toBeInstanceOf(Date);
  });

  it('should throw error when brand does not exist', async () => {
    // Create prerequisite user
    const user = await db.insert(usersTable)
      .values({
        email: 'teammember@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const testInput: CreateTeamMemberInput = {
      brand_id: 99999, // Non-existent brand ID
      user_id: user[0].id,
      role: 'member'
    };

    await expect(createTeamMember(testInput))
      .rejects.toThrow(/brand with id 99999 does not exist/i);
  });

  it('should throw error when user does not exist', async () => {
    // Create prerequisite brand user
    const brandUser = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create brand profile
    const brandProfile = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser[0].id,
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    const testInput: CreateTeamMemberInput = {
      brand_id: brandProfile[0].id,
      user_id: 99999, // Non-existent user ID
      role: 'member'
    };

    await expect(createTeamMember(testInput))
      .rejects.toThrow(/user with id 99999 does not exist/i);
  });

  it('should throw error when user is already a team member', async () => {
    // Create prerequisite user
    const user = await db.insert(usersTable)
      .values({
        email: 'teammember@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create prerequisite brand user
    const brandUser = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create brand profile
    const brandProfile = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser[0].id,
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    // Create existing team member
    await db.insert(teamMembersTable)
      .values({
        brand_id: brandProfile[0].id,
        user_id: user[0].id,
        role: 'member'
      })
      .execute();

    const testInput: CreateTeamMemberInput = {
      brand_id: brandProfile[0].id,
      user_id: user[0].id,
      role: 'admin'
    };

    await expect(createTeamMember(testInput))
      .rejects.toThrow(/user .+ is already a team member/i);
  });

  it('should create team member with different roles', async () => {
    const roles = ['admin', 'manager', 'member'] as const;

    for (const role of roles) {
      // Create prerequisite user for each role
      const user = await db.insert(usersTable)
        .values({
          email: `teammember-${role}@test.com`,
          password_hash: 'hashedpassword',
          user_type: 'brand'
        })
        .returning()
        .execute();

      // Create prerequisite brand user
      const brandUser = await db.insert(usersTable)
        .values({
          email: `brand-${role}@test.com`,
          password_hash: 'hashedpassword',
          user_type: 'brand'
        })
        .returning()
        .execute();

      // Create brand profile
      const brandProfile = await db.insert(brandProfilesTable)
        .values({
          user_id: brandUser[0].id,
          company_name: `Test Company ${role}`
        })
        .returning()
        .execute();

      const testInput: CreateTeamMemberInput = {
        brand_id: brandProfile[0].id,
        user_id: user[0].id,
        role: role
      };

      const result = await createTeamMember(testInput);

      expect(result.role).toEqual(role);
      expect(result.brand_id).toEqual(brandProfile[0].id);
      expect(result.user_id).toEqual(user[0].id);
    }
  });

  it('should verify team member uniqueness per brand-user combination', async () => {
    // Create multiple users
    const user1 = await db.insert(usersTable)
      .values({
        email: 'teammember1@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const user2 = await db.insert(usersTable)
      .values({
        email: 'teammember2@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create multiple brand users
    const brandUser1 = await db.insert(usersTable)
      .values({
        email: 'brand1@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const brandUser2 = await db.insert(usersTable)
      .values({
        email: 'brand2@test.com',
        password_hash: 'hashedpassword',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create brand profiles
    const brandProfile1 = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser1[0].id,
        company_name: 'Test Company 1'
      })
      .returning()
      .execute();

    const brandProfile2 = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser2[0].id,
        company_name: 'Test Company 2'
      })
      .returning()
      .execute();

    // User1 should be able to join both brands
    const result1 = await createTeamMember({
      brand_id: brandProfile1[0].id,
      user_id: user1[0].id,
      role: 'member'
    });

    const result2 = await createTeamMember({
      brand_id: brandProfile2[0].id,
      user_id: user1[0].id,
      role: 'admin'
    });

    expect(result1.brand_id).toEqual(brandProfile1[0].id);
    expect(result2.brand_id).toEqual(brandProfile2[0].id);
    expect(result1.user_id).toEqual(user1[0].id);
    expect(result2.user_id).toEqual(user1[0].id);

    // Both users should be able to join the same brand
    const result3 = await createTeamMember({
      brand_id: brandProfile1[0].id,
      user_id: user2[0].id,
      role: 'manager'
    });

    expect(result3.brand_id).toEqual(brandProfile1[0].id);
    expect(result3.user_id).toEqual(user2[0].id);
  });
});