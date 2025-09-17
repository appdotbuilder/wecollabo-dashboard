import { db } from '../db';
import { campaignsTable, brandProfilesTable } from '../db/schema';
import { type CreateCampaignInput, type Campaign } from '../schema';
import { eq } from 'drizzle-orm';

export const createCampaign = async (input: CreateCampaignInput): Promise<Campaign> => {
  try {
    // Validate that the brand exists
    const brand = await db.select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.id, input.brand_id))
      .execute();

    if (brand.length === 0) {
      throw new Error(`Brand with id ${input.brand_id} not found`);
    }

    // Validate date range
    if (input.end_date <= input.start_date) {
      throw new Error('End date must be after start date');
    }

    // Insert campaign record
    const result = await db.insert(campaignsTable)
      .values({
        brand_id: input.brand_id,
        title: input.title,
        description: input.description,
        budget: input.budget.toString(), // Convert number to string for numeric column
        deliverable_requirements: input.deliverable_requirements,
        start_date: input.start_date,
        end_date: input.end_date
        // status defaults to 'draft' in schema
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const campaign = result[0];
    return {
      ...campaign,
      budget: parseFloat(campaign.budget) // Convert string back to number
    };
  } catch (error) {
    console.error('Campaign creation failed:', error);
    throw error;
  }
};