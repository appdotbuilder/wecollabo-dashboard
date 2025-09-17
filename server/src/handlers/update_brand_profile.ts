import { db } from '../db';
import { brandProfilesTable, usersTable } from '../db/schema';
import { type UpdateBrandProfileInput, type BrandProfile } from '../schema';
import { eq } from 'drizzle-orm';

export const updateBrandProfile = async (input: UpdateBrandProfileInput): Promise<BrandProfile> => {
  try {
    // First, verify that the user exists and is a brand user
    const user = await db.select()
      .from(usersTable)
      .where(eq(usersTable.id, input.user_id))
      .execute();

    if (!user.length) {
      throw new Error('User not found');
    }

    if (user[0].user_type !== 'brand') {
      throw new Error('User is not a brand user');
    }

    // Check if brand profile exists for this user
    const existingProfile = await db.select()
      .from(brandProfilesTable)
      .where(eq(brandProfilesTable.user_id, input.user_id))
      .execute();

    if (!existingProfile.length) {
      throw new Error('Brand profile not found for this user');
    }

    // Build update object with only provided fields
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.company_name !== undefined) {
      updateData.company_name = input.company_name;
    }
    if (input.description !== undefined) {
      updateData.description = input.description;
    }
    if (input.website !== undefined) {
      updateData.website = input.website;
    }
    if (input.industry !== undefined) {
      updateData.industry = input.industry;
    }
    if (input.logo_url !== undefined) {
      updateData.logo_url = input.logo_url;
    }

    // Update the brand profile
    const result = await db.update(brandProfilesTable)
      .set(updateData)
      .where(eq(brandProfilesTable.user_id, input.user_id))
      .returning()
      .execute();

    return result[0];
  } catch (error) {
    console.error('Brand profile update failed:', error);
    throw error;
  }
};