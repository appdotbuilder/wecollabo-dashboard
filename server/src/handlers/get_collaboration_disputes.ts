import { db } from '../db';
import { disputesTable } from '../db/schema';
import { type Dispute } from '../schema';
import { eq } from 'drizzle-orm';

export async function getCollaborationDisputes(collaborationId: number): Promise<Dispute[]> {
  try {
    const results = await db.select()
      .from(disputesTable)
      .where(eq(disputesTable.collaboration_id, collaborationId))
      .execute();

    return results.map(dispute => ({
      ...dispute,
      // No numeric conversions needed - all fields are already proper types
      // from the database schema (integers, strings, dates)
    }));
  } catch (error) {
    console.error('Failed to fetch collaboration disputes:', error);
    throw error;
  }
}