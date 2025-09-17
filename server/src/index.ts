import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';

// Import schemas
import {
  createUserInputSchema,
  createBrandProfileInputSchema,
  createInfluencerProfileInputSchema,
  updateBrandProfileInputSchema,
  updateInfluencerProfileInputSchema,
  getUserProfileInputSchema,
  createDirectMessageInputSchema,
  getMessagesInputSchema,
  markMessageAsReadInputSchema,
  createReviewInputSchema,
  getInfluencerReviewsInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { createBrandProfile } from './handlers/create_brand_profile';
import { createInfluencerProfile } from './handlers/create_influencer_profile';
import { updateBrandProfile } from './handlers/update_brand_profile';
import { updateInfluencerProfile } from './handlers/update_influencer_profile';
import { getUserProfile } from './handlers/get_user_profile';
import { getInfluencerProfiles } from './handlers/get_influencer_profiles';
import { sendMessage } from './handlers/send_message';
import { getMessages } from './handlers/get_messages';
import { markMessageAsRead } from './handlers/mark_message_as_read';
import { createReview } from './handlers/create_review';
import { getInfluencerReviews } from './handlers/get_influencer_reviews';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  getUserProfile: publicProcedure
    .input(getUserProfileInputSchema)
    .query(({ input }) => getUserProfile(input)),

  // Brand profile management
  createBrandProfile: publicProcedure
    .input(createBrandProfileInputSchema)
    .mutation(({ input }) => createBrandProfile(input)),

  updateBrandProfile: publicProcedure
    .input(updateBrandProfileInputSchema)
    .mutation(({ input }) => updateBrandProfile(input)),

  // Influencer profile management
  createInfluencerProfile: publicProcedure
    .input(createInfluencerProfileInputSchema)
    .mutation(({ input }) => createInfluencerProfile(input)),

  updateInfluencerProfile: publicProcedure
    .input(updateInfluencerProfileInputSchema)
    .mutation(({ input }) => updateInfluencerProfile(input)),

  getInfluencerProfiles: publicProcedure
    .query(() => getInfluencerProfiles()),

  // Direct messaging
  sendMessage: publicProcedure
    .input(createDirectMessageInputSchema)
    .mutation(({ input }) => sendMessage(input)),

  getMessages: publicProcedure
    .input(getMessagesInputSchema)
    .query(({ input }) => getMessages(input)),

  markMessageAsRead: publicProcedure
    .input(markMessageAsReadInputSchema)
    .mutation(({ input }) => markMessageAsRead(input)),

  // Reviews
  createReview: publicProcedure
    .input(createReviewInputSchema)
    .mutation(({ input }) => createReview(input)),

  getInfluencerReviews: publicProcedure
    .input(getInfluencerReviewsInputSchema)
    .query(({ input }) => getInfluencerReviews(input)),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();