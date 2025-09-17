import { db } from '../db';
import { collaborationsTable } from '../db/schema';
import { type UpdateCollaborationStatusInput, type Collaboration } from '../schema';
import { eq } from 'drizzle-orm';

export const updateCollaborationStatus = async (input: UpdateCollaborationStatusInput): Promise<Collaboration> => {
  try {
    // First, fetch the current collaboration to validate it exists and check current status
    const existingCollaboration = await db.select()
      .from(collaborationsTable)
      .where(eq(collaborationsTable.id, input.id))
      .execute();

    if (existingCollaboration.length === 0) {
      throw new Error(`Collaboration with id ${input.id} not found`);
    }

    const currentCollaboration = existingCollaboration[0];
    
    // Validate status transition is allowed
    validateStatusTransition(currentCollaboration.status, input.status);

    // Update the collaboration status and updated_at timestamp
    const result = await db.update(collaborationsTable)
      .set({
        status: input.status,
        updated_at: new Date()
      })
      .where(eq(collaborationsTable.id, input.id))
      .returning()
      .execute();

    const updatedCollaboration = result[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...updatedCollaboration,
      agreed_price: parseFloat(updatedCollaboration.agreed_price)
    };
  } catch (error) {
    console.error('Collaboration status update failed:', error);
    throw error;
  }
};

// Helper function to validate status transitions
function validateStatusTransition(currentStatus: string, newStatus: string): void {
  const validTransitions: Record<string, string[]> = {
    'pending': ['accepted', 'declined', 'cancelled'],
    'accepted': ['in_progress', 'cancelled'],
    'declined': [], // Terminal state - no transitions allowed
    'in_progress': ['completed', 'cancelled'],
    'completed': [], // Terminal state - no transitions allowed
    'cancelled': [] // Terminal state - no transitions allowed
  };

  const allowedStatuses = validTransitions[currentStatus];
  
  if (!allowedStatuses || !allowedStatuses.includes(newStatus)) {
    throw new Error(`Invalid status transition from '${currentStatus}' to '${newStatus}'`);
  }
}