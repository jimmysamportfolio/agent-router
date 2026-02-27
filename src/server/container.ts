import { LLMService } from "@/lib/llm";
import {
  ReviewRepository,
  ListingRepository,
  PolicyRepository,
  AgentConfigRepository,
  ViolationRepository,
  ScanRepository,
} from "@/lib/db/repositories";
import {
  ReviewPipelineService,
  PolicyRouterService,
  AgentFactoryService,
  ExplainerService,
} from "@/features/pipeline";
import { ReviewService } from "@/features/reviews";
import { embedTexts } from "@/lib/utils/embedding";
import { getLlmEnv } from "@/config/env";
import type { ReviewJobData } from "@/lib/queue";

export type EnqueueFn = (data: ReviewJobData) => Promise<string>;

export interface Container {
  pipeline: ReviewPipelineService;
  reviewService: ReviewService;
  scanRepo: ScanRepository;
  reviewRepo: ReviewRepository;
}

export function createContainer(enqueueReview: EnqueueFn): Container {
  const { ANTHROPIC_API_KEY } = getLlmEnv();
  const llmService = new LLMService(ANTHROPIC_API_KEY);
  const embeddingService = { embedTexts };

  // Repositories
  const reviewRepo = new ReviewRepository();
  const listingRepo = new ListingRepository();
  const policyRepo = new PolicyRepository();
  const agentConfigRepo = new AgentConfigRepository();
  const violationRepo = new ViolationRepository();
  const scanRepo = new ScanRepository();

  // Pipeline services
  const agentFactory = new AgentFactoryService(llmService);
  const policyRouter = new PolicyRouterService(
    agentConfigRepo,
    policyRepo,
    embeddingService,
  );
  const explainer = new ExplainerService(llmService);
  const pipeline = new ReviewPipelineService(
    reviewRepo,
    listingRepo,
    violationRepo,
    policyRouter,
    agentFactory,
    explainer,
  );

  // Feature services
  const reviewService = new ReviewService(
    reviewRepo,
    listingRepo,
    enqueueReview,
  );

  const container: Container = {
    pipeline,
    reviewService,
    scanRepo,
    reviewRepo,
  };
  return container;
}
