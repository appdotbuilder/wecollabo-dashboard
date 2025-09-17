import { db } from '../db';
import { teamMembersTable, brandProfilesTable, usersTable } from '../db/schema';
import { type CreateTeamMemberInput, type TeamMember } from '../schema';
import { eq, and } from 'drizzle-orm';

export const createTeamMember = async (input: CreateTeamMemberInput): Promise<TeamMember> => {
  try {
    // Verify that the brand profile exists
    const brandExists = await db.select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.id, input.brand_id))
      .execute();

    if (brandExists.length === 0) {
      throw new Error(`Brand with ID ${input.brand_id} does not exist`);
    }

    // Verify that the user exists
    const userExists = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (userExists.length === 0) {
      throw new Error(`User with ID ${input.user_id} does not exist`);
    }

    // Check if the user is already a team member for this brand
    const existingMember = await db.select()
      .from(teamMembersTable)
      .where(
        and(
          eq(teamMembersTable.brand_id, input.brand_id),
          eq(teamMembersTable.user_id, input.user_id)
        )
      )
      .execute();

    if (existingMember.length > 0) {
      throw new Error(`User ${input.user_id} is already a team member of brand ${input.brand_id}`);
    }

    // Insert the team member record
    const result = await db.insert(teamMembersTable)
      .values({
        brand_id: input.brand_id,
        user_id: input.user_id,
        role: input.role
      })
      .returning()
      .execute();

    const teamMember = result[0];
    return teamMember;
  } catch (error) {
    console.error('Team member creation failed:', error);
    throw error;
  }
};