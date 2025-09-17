import { db } from '../db';
import { deliverablesTable, collaborationsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type CreateDeliverableInput, type Deliverable } from '../schema';

export async function createDeliverable(input: CreateDeliverableInput): Promise<Deliverable> {
  try {
    // First, verify that the collaboration exists and is in a valid status
    const collaborations = await db.select()
      .from(collaborationsTable)
      .where(eq(collaborationsTable.id, input.collaboration_id))
      .execute();

    if (collaborations.length === 0) {
      throw new Error(`Collaboration with id ${input.collaboration_id} not found`);
    }

    const collaboration = collaborations[0];
    const validStatuses = ['accepted', 'in_progress'];
    
    if (!validStatuses.includes(collaboration.status)) {
      throw new Error(`Cannot create deliverable for collaboration in ${collaboration.status} status. Valid statuses: ${validStatuses.join(', ')}`);
    }

    // Insert deliverable record
    const result = await db.insert(deliverablesTable)
      .values({
        collaboration_id: input.collaboration_id,
        title: input.title,
        description: input.description || null,
        file_url: input.file_url || null
      })
      .returning()
      .execute();

    const deliverable = result[0];
    return deliverable;
  } catch (error) {
    console.error('Deliverable creation failed:', error);
    throw error;
  }
}