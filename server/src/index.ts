import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createUserInputSchema,
  createInfluencerProfileInputSchema,
  createBrandProfileInputSchema,
  createCampaignInputSchema,
  createCollaborationInputSchema,
  updateCollaborationStatusInputSchema,
  createDeliverableInputSchema,
  updateDeliverableStatusInputSchema,
  createPaymentInputSchema,
  updatePaymentStatusInputSchema,
  createTeamMemberInputSchema,
  createMessageInputSchema,
  createReviewInputSchema,
  createDisputeInputSchema
} from './schema';

// Import handlers
import { createUser } from './handlers/create_user';
import { createInfluencerProfile } from './handlers/create_influencer_profile';
import { createBrandProfile } from './handlers/create_brand_profile';
import { getInfluencerProfile } from './handlers/get_influencer_profile';
import { getBrandProfile } from './handlers/get_brand_profile';
import { createCampaign } from './handlers/create_campaign';
import { getCampaigns } from './handlers/get_campaigns';
import { getBrandCampaigns } from './handlers/get_brand_campaigns';
import { discoverInfluencers } from './handlers/discover_influencers';
import { createCollaboration } from './handlers/create_collaboration';
import { getInfluencerCollaborations } from './handlers/get_influencer_collaborations';
import { updateCollaborationStatus } from './handlers/update_collaboration_status';
import { createDeliverable } from './handlers/create_deliverable';
import { getCollaborationDeliverables } from './handlers/get_collaboration_deliverables';
import { updateDeliverableStatus } from './handlers/update_deliverable_status';
import { createPayment } from './handlers/create_payment';
import { getInfluencerEarnings } from './handlers/get_influencer_earnings';
import { updatePaymentStatus } from './handlers/update_payment_status';
import { createTeamMember } from './handlers/create_team_member';
import { getBrandTeamMembers } from './handlers/get_brand_team_members';
import { createMessage } from './handlers/create_message';
import { getCollaborationMessages } from './handlers/get_collaboration_messages';
import { createReview } from './handlers/create_review';
import { getUserReviews } from './handlers/get_user_reviews';
import { createDispute } from './handlers/create_dispute';
import { getCollaborationDisputes } from './handlers/get_collaboration_disputes';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // User management
  createUser: publicProcedure
    .input(createUserInputSchema)
    .mutation(({ input }) => createUser(input)),

  // Profile management
  createInfluencerProfile: publicProcedure
    .input(createInfluencerProfileInputSchema)
    .mutation(({ input }) => createInfluencerProfile(input)),

  createBrandProfile: publicProcedure
    .input(createBrandProfileInputSchema)
    .mutation(({ input }) => createBrandProfile(input)),

  getInfluencerProfile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getInfluencerProfile(input.userId)),

  getBrandProfile: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getBrandProfile(input.userId)),

  // Campaign management
  createCampaign: publicProcedure
    .input(createCampaignInputSchema)
    .mutation(({ input }) => createCampaign(input)),

  getCampaigns: publicProcedure
    .query(() => getCampaigns()),

  getBrandCampaigns: publicProcedure
    .input(z.object({ brandId: z.number() }))
    .query(({ input }) => getBrandCampaigns(input.brandId)),

  // Influencer discovery
  discoverInfluencers: publicProcedure
    .query(() => discoverInfluencers()),

  // Collaboration management
  createCollaboration: publicProcedure
    .input(createCollaborationInputSchema)
    .mutation(({ input }) => createCollaboration(input)),

  getInfluencerCollaborations: publicProcedure
    .input(z.object({ influencerId: z.number() }))
    .query(({ input }) => getInfluencerCollaborations(input.influencerId)),

  updateCollaborationStatus: publicProcedure
    .input(updateCollaborationStatusInputSchema)
    .mutation(({ input }) => updateCollaborationStatus(input)),

  // Deliverable management
  createDeliverable: publicProcedure
    .input(createDeliverableInputSchema)
    .mutation(({ input }) => createDeliverable(input)),

  getCollaborationDeliverables: publicProcedure
    .input(z.object({ collaborationId: z.number() }))
    .query(({ input }) => getCollaborationDeliverables(input.collaborationId)),

  updateDeliverableStatus: publicProcedure
    .input(updateDeliverableStatusInputSchema)
    .mutation(({ input }) => updateDeliverableStatus(input)),

  // Payment management (escrow system)
  createPayment: publicProcedure
    .input(createPaymentInputSchema)
    .mutation(({ input }) => createPayment(input)),

  getInfluencerEarnings: publicProcedure
    .input(z.object({ influencerId: z.number() }))
    .query(({ input }) => getInfluencerEarnings(input.influencerId)),

  updatePaymentStatus: publicProcedure
    .input(updatePaymentStatusInputSchema)
    .mutation(({ input }) => updatePaymentStatus(input)),

  // Team management
  createTeamMember: publicProcedure
    .input(createTeamMemberInputSchema)
    .mutation(({ input }) => createTeamMember(input)),

  getBrandTeamMembers: publicProcedure
    .input(z.object({ brandId: z.number() }))
    .query(({ input }) => getBrandTeamMembers(input.brandId)),

  // Messaging system
  createMessage: publicProcedure
    .input(createMessageInputSchema)
    .mutation(({ input }) => createMessage(input)),

  getCollaborationMessages: publicProcedure
    .input(z.object({ collaborationId: z.number() }))
    .query(({ input }) => getCollaborationMessages(input.collaborationId)),

  // Review system
  createReview: publicProcedure
    .input(createReviewInputSchema)
    .mutation(({ input }) => createReview(input)),

  getUserReviews: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => getUserReviews(input.userId)),

  // Dispute resolution
  createDispute: publicProcedure
    .input(createDisputeInputSchema)
    .mutation(({ input }) => createDispute(input)),

  getCollaborationDisputes: publicProcedure
    .input(z.object({ collaborationId: z.number() }))
    .query(({ input }) => getCollaborationDisputes(input.collaborationId)),
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
  console.log(`WeCollabo TRPC server listening at port: ${port}`);
}

start();