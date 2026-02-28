import { LLMService } from "@/lib/llm";
import {
  PipelineService,
  PolicyRouterService,
  PolicyRepository,
  AgentConfigRepository,
  AgentFactoryService,
  ExplainerService,
  AggregatorService,
} from "@/features/pipeline";
import {
  ReviewService,
  ReviewRepository,
  ListingRepository,
  ViolationRepository,
  ScanRepository,
} from "@/features/reviews";
import { GeminiEmbeddingService } from "@/lib/utils/embedding";
import { getLlmEnv } from "@/config/env";
import type { ReviewJobData } from "@/server/queue";

export type EnqueueFn = (data: ReviewJobData) => Promise<string>;

export interface Container {
  pipeline: PipelineService;
  submissionService: ReviewService;
  scanRepo: ScanRepository;
  reviewRepo: ReviewRepository;
  listingRepo: ListingRepository;
  violationRepo: ViolationRepository;
}

export function createContainer(enqueueReview: EnqueueFn): Container {
  const { ANTHROPIC_API_KEY } = getLlmEnv();
  const llmService = new LLMService(ANTHROPIC_API_KEY);
  const embeddingService = new GeminiEmbeddingService();

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
  const aggregator = new AggregatorService();
  const pipeline = new PipelineService(
    policyRouter,
    agentFactory,
    explainer,
    aggregator,
  );

  // Feature services
  const submissionService = new ReviewService(
    reviewRepo,
    listingRepo,
    enqueueReview,
  );

  const container: Container = {
    pipeline,
    submissionService,
    scanRepo,
    reviewRepo,
    listingRepo,
    violationRepo,
  };
  return container;
}
