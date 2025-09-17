import { serial, text, pgTable, timestamp, numeric, integer, boolean, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userTypeEnum = pgEnum('user_type', ['influencer', 'brand']);
export const campaignStatusEnum = pgEnum('campaign_status', ['draft', 'active', 'paused', 'completed', 'cancelled']);
export const collaborationStatusEnum = pgEnum('collaboration_status', ['pending', 'accepted', 'declined', 'in_progress', 'completed', 'cancelled']);
export const deliverableStatusEnum = pgEnum('deliverable_status', ['pending', 'submitted', 'approved', 'revision_requested', 'rejected']);
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'in_escrow', 'released', 'refunded']);
export const messageTypeEnum = pgEnum('message_type', ['text', 'file', 'system']);
export const disputeStatusEnum = pgEnum('dispute_status', ['open', 'in_review', 'resolved', 'closed']);
export const teamRoleEnum = pgEnum('team_role', ['admin', 'manager', 'member']);

// Users table
export const usersTable = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  password_hash: text('password_hash').notNull(),
  user_type: userTypeEnum('user_type').notNull(),
  is_verified: boolean('is_verified').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Influencer profiles table
export const influencerProfilesTable = pgTable('influencer_profiles', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  display_name: text('display_name').notNull(),
  bio: text('bio'),
  profile_image: text('profile_image'),
  total_reach: integer('total_reach').default(0).notNull(),
  engagement_rate: numeric('engagement_rate', { precision: 5, scale: 2 }).default('0').notNull(),
  total_collaborations: integer('total_collaborations').default(0).notNull(),
  rating: numeric('rating', { precision: 3, scale: 2 }).default('0').notNull(),
  total_earnings: numeric('total_earnings', { precision: 10, scale: 2 }).default('0').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Brand profiles table
export const brandProfilesTable = pgTable('brand_profiles', {
  id: serial('id').primaryKey(),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  company_name: text('company_name').notNull(),
  company_description: text('company_description'),
  logo: text('logo'),
  website: text('website'),
  industry: text('industry'),
  total_campaigns: integer('total_campaigns').default(0).notNull(),
  rating: numeric('rating', { precision: 3, scale: 2 }).default('0').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Campaigns table
export const campaignsTable = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  brand_id: integer('brand_id').notNull().references(() => brandProfilesTable.id),
  title: text('title').notNull(),
  description: text('description').notNull(),
  budget: numeric('budget', { precision: 10, scale: 2 }).notNull(),
  deliverable_requirements: text('deliverable_requirements').notNull(),
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date').notNull(),
  status: campaignStatusEnum('status').default('draft').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Collaborations table
export const collaborationsTable = pgTable('collaborations', {
  id: serial('id').primaryKey(),
  campaign_id: integer('campaign_id').notNull().references(() => campaignsTable.id),
  influencer_id: integer('influencer_id').notNull().references(() => influencerProfilesTable.id),
  agreed_price: numeric('agreed_price', { precision: 10, scale: 2 }).notNull(),
  status: collaborationStatusEnum('status').default('pending').notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Deliverables table
export const deliverablesTable = pgTable('deliverables', {
  id: serial('id').primaryKey(),
  collaboration_id: integer('collaboration_id').notNull().references(() => collaborationsTable.id),
  title: text('title').notNull(),
  description: text('description'),
  file_url: text('file_url'),
  status: deliverableStatusEnum('status').default('pending').notNull(),
  feedback: text('feedback'),
  submitted_at: timestamp('submitted_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Payments table
export const paymentsTable = pgTable('payments', {
  id: serial('id').primaryKey(),
  collaboration_id: integer('collaboration_id').notNull().references(() => collaborationsTable.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  platform_commission: numeric('platform_commission', { precision: 10, scale: 2 }).notNull(),
  influencer_payout: numeric('influencer_payout', { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum('status').default('pending').notNull(),
  transaction_id: text('transaction_id'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Team members table
export const teamMembersTable = pgTable('team_members', {
  id: serial('id').primaryKey(),
  brand_id: integer('brand_id').notNull().references(() => brandProfilesTable.id),
  user_id: integer('user_id').notNull().references(() => usersTable.id),
  role: teamRoleEnum('role').default('member').notNull(),
  invited_at: timestamp('invited_at').defaultNow().notNull(),
  joined_at: timestamp('joined_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Messages table
export const messagesTable = pgTable('messages', {
  id: serial('id').primaryKey(),
  collaboration_id: integer('collaboration_id').notNull().references(() => collaborationsTable.id),
  sender_id: integer('sender_id').notNull().references(() => usersTable.id),
  content: text('content').notNull(),
  message_type: messageTypeEnum('message_type').default('text').notNull(),
  file_url: text('file_url'),
  sent_at: timestamp('sent_at').defaultNow().notNull(),
  read_at: timestamp('read_at'),
  created_at: timestamp('created_at').defaultNow().notNull()
});

// Reviews table
export const reviewsTable = pgTable('reviews', {
  id: serial('id').primaryKey(),
  collaboration_id: integer('collaboration_id').notNull().references(() => collaborationsTable.id),
  reviewer_id: integer('reviewer_id').notNull().references(() => usersTable.id),
  reviewee_id: integer('reviewee_id').notNull().references(() => usersTable.id),
  rating: integer('rating').notNull(),
  comment: text('comment'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Disputes table
export const disputesTable = pgTable('disputes', {
  id: serial('id').primaryKey(),
  collaboration_id: integer('collaboration_id').notNull().references(() => collaborationsTable.id),
  initiated_by: integer('initiated_by').notNull().references(() => usersTable.id),
  subject: text('subject').notNull(),
  description: text('description').notNull(),
  status: disputeStatusEnum('status').default('open').notNull(),
  resolution: text('resolution'),
  resolved_at: timestamp('resolved_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const usersRelations = relations(usersTable, ({ one, many }) => ({
  influencerProfile: one(influencerProfilesTable, {
    fields: [usersTable.id],
    references: [influencerProfilesTable.user_id]
  }),
  brandProfile: one(brandProfilesTable, {
    fields: [usersTable.id],
    references: [brandProfilesTable.user_id]
  }),
  teamMemberships: many(teamMembersTable),
  sentMessages: many(messagesTable),
  reviewsGiven: many(reviewsTable, { relationName: 'reviewer' }),
  reviewsReceived: many(reviewsTable, { relationName: 'reviewee' }),
  disputesInitiated: many(disputesTable)
}));

export const influencerProfilesRelations = relations(influencerProfilesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [influencerProfilesTable.user_id],
    references: [usersTable.id]
  }),
  collaborations: many(collaborationsTable)
}));

export const brandProfilesRelations = relations(brandProfilesTable, ({ one, many }) => ({
  user: one(usersTable, {
    fields: [brandProfilesTable.user_id],
    references: [usersTable.id]
  }),
  campaigns: many(campaignsTable),
  teamMembers: many(teamMembersTable)
}));

export const campaignsRelations = relations(campaignsTable, ({ one, many }) => ({
  brand: one(brandProfilesTable, {
    fields: [campaignsTable.brand_id],
    references: [brandProfilesTable.id]
  }),
  collaborations: many(collaborationsTable)
}));

export const collaborationsRelations = relations(collaborationsTable, ({ one, many }) => ({
  campaign: one(campaignsTable, {
    fields: [collaborationsTable.campaign_id],
    references: [campaignsTable.id]
  }),
  influencer: one(influencerProfilesTable, {
    fields: [collaborationsTable.influencer_id],
    references: [influencerProfilesTable.id]
  }),
  deliverables: many(deliverablesTable),
  payments: many(paymentsTable),
  messages: many(messagesTable),
  reviews: many(reviewsTable),
  disputes: many(disputesTable)
}));

export const deliverablesRelations = relations(deliverablesTable, ({ one }) => ({
  collaboration: one(collaborationsTable, {
    fields: [deliverablesTable.collaboration_id],
    references: [collaborationsTable.id]
  })
}));

export const paymentsRelations = relations(paymentsTable, ({ one }) => ({
  collaboration: one(collaborationsTable, {
    fields: [paymentsTable.collaboration_id],
    references: [collaborationsTable.id]
  })
}));

export const teamMembersRelations = relations(teamMembersTable, ({ one }) => ({
  brand: one(brandProfilesTable, {
    fields: [teamMembersTable.brand_id],
    references: [brandProfilesTable.id]
  }),
  user: one(usersTable, {
    fields: [teamMembersTable.user_id],
    references: [usersTable.id]
  })
}));

export const messagesRelations = relations(messagesTable, ({ one }) => ({
  collaboration: one(collaborationsTable, {
    fields: [messagesTable.collaboration_id],
    references: [collaborationsTable.id]
  }),
  sender: one(usersTable, {
    fields: [messagesTable.sender_id],
    references: [usersTable.id]
  })
}));

export const reviewsRelations = relations(reviewsTable, ({ one }) => ({
  collaboration: one(collaborationsTable, {
    fields: [reviewsTable.collaboration_id],
    references: [collaborationsTable.id]
  }),
  reviewer: one(usersTable, {
    fields: [reviewsTable.reviewer_id],
    references: [usersTable.id],
    relationName: 'reviewer'
  }),
  reviewee: one(usersTable, {
    fields: [reviewsTable.reviewee_id],
    references: [usersTable.id],
    relationName: 'reviewee'
  })
}));

export const disputesRelations = relations(disputesTable, ({ one }) => ({
  collaboration: one(collaborationsTable, {
    fields: [disputesTable.collaboration_id],
    references: [collaborationsTable.id]
  }),
  initiatedBy: one(usersTable, {
    fields: [disputesTable.initiated_by],
    references: [usersTable.id]
  })
}));

// Export all tables for proper query building
export const tables = {
  users: usersTable,
  influencerProfiles: influencerProfilesTable,
  brandProfiles: brandProfilesTable,
  campaigns: campaignsTable,
  collaborations: collaborationsTable,
  deliverables: deliverablesTable,
  payments: paymentsTable,
  teamMembers: teamMembersTable,
  messages: messagesTable,
  reviews: reviewsTable,
  disputes: disputesTable
};