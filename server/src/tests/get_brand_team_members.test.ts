import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { usersTable, brandProfilesTable, teamMembersTable } from '../db/schema';
import { getBrandTeamMembers } from '../handlers/get_brand_team_members';

describe('getBrandTeamMembers', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return team members for a brand', async () => {
    // Create test users
    const [brandUser] = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hash',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [memberUser1] = await db.insert(usersTable)
      .values({
        email: 'member1@test.com',
        password_hash: 'hash',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [memberUser2] = await db.insert(usersTable)
      .values({
        email: 'member2@test.com',
        password_hash: 'hash',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create brand profile
    const [brandProfile] = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser.id,
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    // Create team members
    const [teamMember1] = await db.insert(teamMembersTable)
      .values({
        brand_id: brandProfile.id,
        user_id: memberUser1.id,
        role: 'admin'
      })
      .returning()
      .execute();

    const [teamMember2] = await db.insert(teamMembersTable)
      .values({
        brand_id: brandProfile.id,
        user_id: memberUser2.id,
        role: 'manager'
      })
      .returning()
      .execute();

    const result = await getBrandTeamMembers(brandProfile.id);

    expect(result).toHaveLength(2);
    
    // Verify first team member
    const member1 = result.find(m => m.id === teamMember1.id);
    expect(member1).toBeDefined();
    expect(member1!.brand_id).toEqual(brandProfile.id);
    expect(member1!.user_id).toEqual(memberUser1.id);
    expect(member1!.role).toEqual('admin');
    expect(member1!.invited_at).toBeInstanceOf(Date);
    expect(member1!.joined_at).toBeNull();
    expect(member1!.created_at).toBeInstanceOf(Date);
    expect(member1!.updated_at).toBeInstanceOf(Date);

    // Verify second team member
    const member2 = result.find(m => m.id === teamMember2.id);
    expect(member2).toBeDefined();
    expect(member2!.brand_id).toEqual(brandProfile.id);
    expect(member2!.user_id).toEqual(memberUser2.id);
    expect(member2!.role).toEqual('manager');
    expect(member2!.invited_at).toBeInstanceOf(Date);
    expect(member2!.joined_at).toBeNull();
    expect(member2!.created_at).toBeInstanceOf(Date);
    expect(member2!.updated_at).toBeInstanceOf(Date);
  });

  it('should return empty array when brand has no team members', async () => {
    // Create test user and brand profile
    const [brandUser] = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hash',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [brandProfile] = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser.id,
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    const result = await getBrandTeamMembers(brandProfile.id);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should return empty array for non-existent brand', async () => {
    const result = await getBrandTeamMembers(999);

    expect(result).toHaveLength(0);
    expect(result).toEqual([]);
  });

  it('should handle team members with different roles', async () => {
    // Create test users
    const [brandUser] = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hash',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [adminUser] = await db.insert(usersTable)
      .values({
        email: 'admin@test.com',
        password_hash: 'hash',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [managerUser] = await db.insert(usersTable)
      .values({
        email: 'manager@test.com',
        password_hash: 'hash',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [memberUser] = await db.insert(usersTable)
      .values({
        email: 'member@test.com',
        password_hash: 'hash',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create brand profile
    const [brandProfile] = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser.id,
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    // Create team members with different roles
    await db.insert(teamMembersTable)
      .values([
        {
          brand_id: brandProfile.id,
          user_id: adminUser.id,
          role: 'admin'
        },
        {
          brand_id: brandProfile.id,
          user_id: managerUser.id,
          role: 'manager'
        },
        {
          brand_id: brandProfile.id,
          user_id: memberUser.id,
          role: 'member'
        }
      ])
      .execute();

    const result = await getBrandTeamMembers(brandProfile.id);

    expect(result).toHaveLength(3);

    const roles = result.map(member => member.role).sort();
    expect(roles).toEqual(['admin', 'manager', 'member']);
  });

  it('should handle team members with joined_at dates', async () => {
    // Create test users
    const [brandUser] = await db.insert(usersTable)
      .values({
        email: 'brand@test.com',
        password_hash: 'hash',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [memberUser] = await db.insert(usersTable)
      .values({
        email: 'member@test.com',
        password_hash: 'hash',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create brand profile
    const [brandProfile] = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser.id,
        company_name: 'Test Company'
      })
      .returning()
      .execute();

    const joinedDate = new Date('2024-01-15T10:00:00Z');

    // Create team member with joined_at date
    const [teamMember] = await db.insert(teamMembersTable)
      .values({
        brand_id: brandProfile.id,
        user_id: memberUser.id,
        role: 'member',
        joined_at: joinedDate
      })
      .returning()
      .execute();

    const result = await getBrandTeamMembers(brandProfile.id);

    expect(result).toHaveLength(1);
    expect(result[0].joined_at).toBeInstanceOf(Date);
    expect(result[0].joined_at).toEqual(joinedDate);
  });

  it('should only return team members for the specified brand', async () => {
    // Create test users
    const [brandUser1] = await db.insert(usersTable)
      .values({
        email: 'brand1@test.com',
        password_hash: 'hash',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [brandUser2] = await db.insert(usersTable)
      .values({
        email: 'brand2@test.com',
        password_hash: 'hash',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [memberUser1] = await db.insert(usersTable)
      .values({
        email: 'member1@test.com',
        password_hash: 'hash',
        user_type: 'brand'
      })
      .returning()
      .execute();

    const [memberUser2] = await db.insert(usersTable)
      .values({
        email: 'member2@test.com',
        password_hash: 'hash',
        user_type: 'brand'
      })
      .returning()
      .execute();

    // Create brand profiles
    const [brandProfile1] = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser1.id,
        company_name: 'Test Company 1'
      })
      .returning()
      .execute();

    const [brandProfile2] = await db.insert(brandProfilesTable)
      .values({
        user_id: brandUser2.id,
        company_name: 'Test Company 2'
      })
      .returning()
      .execute();

    // Create team members for both brands
    await db.insert(teamMembersTable)
      .values([
        {
          brand_id: brandProfile1.id,
          user_id: memberUser1.id,
          role: 'admin'
        },
        {
          brand_id: brandProfile2.id,
          user_id: memberUser2.id,
          role: 'manager'
        }
      ])
      .execute();

    // Test that we only get team members for brand 1
    const result1 = await getBrandTeamMembers(brandProfile1.id);
    expect(result1).toHaveLength(1);
    expect(result1[0].brand_id).toEqual(brandProfile1.id);
    expect(result1[0].user_id).toEqual(memberUser1.id);
    expect(result1[0].role).toEqual('admin');

    // Test that we only get team members for brand 2
    const result2 = await getBrandTeamMembers(brandProfile2.id);
    expect(result2).toHaveLength(1);
    expect(result2[0].brand_id).toEqual(brandProfile2.id);
    expect(result2[0].user_id).toEqual(memberUser2.id);
    expect(result2[0].role).toEqual('manager');
  });
});