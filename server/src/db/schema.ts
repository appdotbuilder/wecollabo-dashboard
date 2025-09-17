import { serial, text, pgTable, timestamp, integer, boolean, numeric, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enum for user types
export const userTypeEnum = pgEnum('user_type', ['brand', 'influencer']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  user_type: userTypeEnum('user_type').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Brand profiles table
export const brandProfilesTable = pgTable('brand_profiles', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  company_name: text('company_name').notNull(),
  description: text('description'), // Nullable
  website: text('website'), // Nullable
  industry: text('industry'), // Nullable
  logo_url: text('logo_url'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Influencer profiles table
export const influencerProfilesTable = pgTable('influencer_profiles', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  display_name: text('display_name').notNull(),
  bio: text('bio'), // Nullable
  avatar_url: text('avatar_url'), // Nullable
  instagram_handle: text('instagram_handle'), // Nullable
  tiktok_handle: text('tiktok_handle'), // Nullable
  youtube_handle: text('youtube_handle'), // Nullable
  follower_count: integer('follower_count'), // Nullable
  engagement_rate: numeric('engagement_rate', { precision: 5, scale: 2 }), // Nullable, stored as numeric but handled as number in Zod
  category: text('category'), // Nullable
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Direct messages table
export const directMessagesTable = pgTable('direct_messages', {
  id: serial('id').primaryKey(),
  sender_id: integer('sender_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  recipient_id: integer('recipient_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  is_read: boolean('is_read').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Reviews table
export const reviewsTable = pgTable('reviews', {
  id: serial('id').primaryKey(),
  brand_user_id: integer('brand_user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  influencer_user_id: integer('influencer_user_id').notNull().references(() => usersTable.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(), // 1-5 stars
  feedback: text('feedback').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ one, many }) => ({
  brandProfile: one(brandProfilesTable, {
    fields: [usersTable.id],
    references: [brandProfilesTable.user_id],
  }),
  influencerProfile: one(influencerProfilesTable, {
    fields: [usersTable.id],
    references: [influencerProfilesTable.user_id],
  }),
  sentMessages: many(directMessagesTable, { relationName: 'sender' }),
  receivedMessages: many(directMessagesTable, { relationName: 'recipient' }),
  givenReviews: many(reviewsTable, { relationName: 'brandReviews' }),
  receivedReviews: many(reviewsTable, { relationName: 'influencerReviews' }),
}));

export const brandProfilesRelations = relations(brandProfilesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [brandProfilesTable.user_id],
    references: [usersTable.id],
  }),
}));

export const influencerProfilesRelations = relations(influencerProfilesTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [influencerProfilesTable.user_id],
    references: [usersTable.id],
  }),
}));

export const directMessagesRelations = relations(directMessagesTable, ({ one }) => ({
  sender: one(usersTable, {
    fields: [directMessagesTable.sender_id],
    references: [usersTable.id],
    relationName: 'sender',
  }),
  recipient: one(usersTable, {
    fields: [directMessagesTable.recipient_id],
    references: [usersTable.id],
    relationName: 'recipient',
  }),
}));

export const reviewsRelations = relations(reviewsTable, ({ one }) => ({
  brand: one(usersTable, {
    fields: [reviewsTable.brand_user_id],
    references: [usersTable.id],
    relationName: 'brandReviews',
  }),
  influencer: one(usersTable, {
    fields: [reviewsTable.influencer_user_id],
    references: [usersTable.id],
    relationName: 'influencerReviews',
  }),
}));

// TypeScript types for the table schemas
export type User = typeof usersTable.$inferSelect;
export type NewUser = typeof usersTable.$inferInsert;

export type BrandProfile = typeof brandProfilesTable.$inferSelect;
export type NewBrandProfile = typeof brandProfilesTable.$inferInsert;

export type InfluencerProfile = typeof influencerProfilesTable.$inferSelect;
export type NewInfluencerProfile = typeof influencerProfilesTable.$inferInsert;

export type DirectMessage = typeof directMessagesTable.$inferSelect;
export type NewDirectMessage = typeof directMessagesTable.$inferInsert;

export type Review = typeof reviewsTable.$inferSelect;
export type NewReview = typeof reviewsTable.$inferInsert;

// Export all tables and relations for proper query building
export const tables = {
  users: usersTable,
  brandProfiles: brandProfilesTable,
  influencerProfiles: influencerProfilesTable,
  directMessages: directMessagesTable,
  reviews: reviewsTable,
};