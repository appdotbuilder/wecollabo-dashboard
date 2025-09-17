import { db } from '../db';
import { brandProfilesTable, usersTable } from '../db/schema';
import { type CreateBrandProfileInput, type BrandProfile } from '../schema';
import { eq } from 'drizzle-orm';

export const createBrandProfile = async (input: CreateBrandProfileInput): Promise<BrandProfile> => {
  try {
    // Validate that the user exists and is of type 'brand'
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (user.length === 0) {
      throw new Error(`User with id ${input.user_id} not found`);
    }

    if (user[0].user_type !== 'brand') {
      throw new Error(`User with id ${input.user_id} is not a brand user`);
    }

    // Insert brand profile record
    const result = await db.insert(brandProfilesTable)
      .values({
        user_id: input.user_id,
        company_name: input.company_name,
        description: input.description || null,
        website: input.website || null,
        industry: input.industry || null,
        logo_url: input.logo_url || null
      })
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Brand profile creation failed:', error);
    throw error;
  }
};