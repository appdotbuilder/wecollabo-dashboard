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
      throw new Error('User not found');
    }

    if (user[0].user_type !== 'brand') {
      throw new Error('User must be of type "brand" to create a brand profile');
    }

    // Insert brand profile record
    const result = await db.insert(brandProfilesTable)
      .values({
        user_id: input.user_id,
        company_name: input.company_name,
        company_description: input.company_description || null,
        logo: input.logo || null,
        website: input.website || null,
        industry: input.industry || null
      })
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    const brandProfile = result[0];
    return {
      ...brandProfile,
      rating: parseFloat(brandProfile.rating) // Convert string back to number
    };
  } catch (error) {
    console.error('Brand profile creation failed:', error);
    throw error;
  }
};