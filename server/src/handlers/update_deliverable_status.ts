import { db } from '../db';
import { deliverablesTable } from '../db/schema';
import { type UpdateDeliverableStatusInput, type Deliverable } from '../schema';
import { eq } from 'drizzle-orm';

export const updateDeliverableStatus = async (input: UpdateDeliverableStatusInput): Promise<Deliverable> => {
  try {
    // Prepare update values
    const updateValues: any = {
      status: input.status,
      updated_at: new Date()
    };

    // Add feedback if provided
    if (input.feedback !== undefined) {
      updateValues.feedback = input.feedback;
    }

    // Set submitted_at when status changes to 'submitted'
    if (input.status === 'submitted') {
      updateValues.submitted_at = new Date();
    }

    // Update deliverable record
    const result = await db.update(deliverablesTable)
      .set(updateValues)
      .where(eq(deliverablesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Deliverable with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const deliverable = result[0];
    return {
      ...deliverable,
      // All fields are already properly typed, no numeric conversions needed for deliverables
    };
  } catch (error) {
    console.error('Deliverable status update failed:', error);
    throw error;
  }
};