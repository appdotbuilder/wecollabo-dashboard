import { db } from '../db';
import { teamMembersTable, usersTable } from '../db/schema';
import { type TeamMember } from '../schema';
import { eq } from 'drizzle-orm';

export const getBrandTeamMembers = async (brandId: number): Promise<TeamMember[]> => {
  try {
    // Query team members for the specified brand with user details
    const results = await db.select()
      .from(teamMembersTable)
      .innerJoin(usersTable, eq(teamMembersTable.user_id, usersTable.id))
      .where(eq(teamMembersTable.brand_id, brandId))
      .execute();

    // Transform the joined results into TeamMember objects
    return results.map(result => ({
      id: result.team_members.id,
      brand_id: result.team_members.brand_id,
      user_id: result.team_members.user_id,
      role: result.team_members.role,
      invited_at: result.team_members.invited_at,
      joined_at: result.team_members.joined_at,
      created_at: result.team_members.created_at,
      updated_at: result.team_members.updated_at
    }));
  } catch (error) {
    console.error('Failed to fetch brand team members:', error);
    throw error;
  }
};