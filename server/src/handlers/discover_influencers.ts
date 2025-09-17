import { db } from '../db';
import { influencerProfilesTable } from '../db/schema';
import { type InfluencerProfile } from '../schema';
import { type SQL } from 'drizzle-orm';
import { and, gte, lte, desc, asc } from 'drizzle-orm';
import { z } from 'zod';

// Input schema for discover influencers
export const discoverInfluencersInputSchema = z.object({
  min_reach: z.number().nonnegative().optional(),
  max_reach: z.number().nonnegative().optional(),
  min_engagement_rate: z.number().min(0).max(100).optional(),
  max_engagement_rate: z.number().min(0).max(100).optional(),
  min_rating: z.number().min(0).max(5).optional(),
  min_collaborations: z.number().nonnegative().optional(),
  sort_by: z.enum(['total_reach', 'engagement_rate', 'rating', 'total_collaborations', 'created_at']).default('rating'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
  limit: z.number().positive().max(100).default(20),
  offset: z.number().nonnegative().default(0)
});

export type DiscoverInfluencersInput = z.infer<typeof discoverInfluencersInputSchema>;
export type DiscoverInfluencersRawInput = z.input<typeof discoverInfluencersInputSchema>;

export const discoverInfluencers = async (rawInput: DiscoverInfluencersRawInput = {}): Promise<InfluencerProfile[]> => {
  try {
    // Parse input with defaults applied
    const input = discoverInfluencersInputSchema.parse(rawInput);

    // Build conditions array for filtering
    const conditions: SQL<unknown>[] = [];

    if (input.min_reach !== undefined) {
      conditions.push(gte(influencerProfilesTable.total_reach, input.min_reach));
    }

    if (input.max_reach !== undefined) {
      conditions.push(lte(influencerProfilesTable.total_reach, input.max_reach));
    }

    if (input.min_engagement_rate !== undefined) {
      conditions.push(gte(influencerProfilesTable.engagement_rate, input.min_engagement_rate.toString()));
    }

    if (input.max_engagement_rate !== undefined) {
      conditions.push(lte(influencerProfilesTable.engagement_rate, input.max_engagement_rate.toString()));
    }

    if (input.min_rating !== undefined) {
      conditions.push(gte(influencerProfilesTable.rating, input.min_rating.toString()));
    }

    if (input.min_collaborations !== undefined) {
      conditions.push(gte(influencerProfilesTable.total_collaborations, input.min_collaborations));
    }

    // Build query with proper sorting
    const sortColumn = influencerProfilesTable[input.sort_by];
    const sortDirection = input.sort_order === 'desc' ? desc(sortColumn) : asc(sortColumn);

    // Execute query with conditions, sorting, and pagination
    const results = conditions.length > 0 
      ? await db.select()
          .from(influencerProfilesTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(sortDirection)
          .limit(input.limit)
          .offset(input.offset)
          .execute()
      : await db.select()
          .from(influencerProfilesTable)
          .orderBy(sortDirection)
          .limit(input.limit)
          .offset(input.offset)
          .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(profile => ({
      ...profile,
      engagement_rate: parseFloat(profile.engagement_rate),
      rating: parseFloat(profile.rating),
      total_earnings: parseFloat(profile.total_earnings)
    }));

  } catch (error) {
    console.error('Discover influencers failed:', error);
    throw error;
  }
};