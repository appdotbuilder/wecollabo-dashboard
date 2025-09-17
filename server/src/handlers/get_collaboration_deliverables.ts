import { db } from '../db';
import { deliverablesTable } from '../db/schema';
import { type Deliverable } from '../schema';
import { eq, asc } from 'drizzle-orm';

export async function getCollaborationDeliverables(collaborationId: number): Promise<Deliverable[]> {
  try {
    const results = await db.select()
      .from(deliverablesTable)
      .where(eq(deliverablesTable.collaboration_id, collaborationId))
      .orderBy(asc(deliverablesTable.created_at))
      .execute();

    // Convert numeric fields back to numbers for the response
    return results.map(deliverable => ({
      ...deliverable,
      // No numeric fields to convert in deliverables table
      created_at: deliverable.created_at,
      updated_at: deliverable.updated_at,
      submitted_at: deliverable.submitted_at
    }));
  } catch (error) {
    console.error('Failed to fetch collaboration deliverables:', error);
    throw error;
  }
}