import type { IReviewRepository } from "@/lib/db/repositories/review.repository";
import type { IListingRepository } from "@/lib/db/repositories/listing.repository";
import type { IViolationRepository } from "@/lib/db/repositories/violation.repository";
import { executeInTransaction } from "@/lib/db/client";
import { DatabaseError } from "@/lib/errors";
import { aggregateResults } from "@/features/pipeline/services/aggregator";
import { TokenTracker } from "@/features/pipeline/guardrails/budget";
import type { PolicyRouterService } from "@/features/pipeline/services/router";
import type { IAgentFactory } from "@/features/pipeline/agents/agent.interface";
import type { ExplainerService } from "@/features/pipeline/services/explainer";
import type { ListingRow } from "@/types";
import type {
  AgentDispatchPlan,
  AgentInput,
  AggregatedDecision,
  AggregationResult,
  NodeTrace,
  ReviewWithListing,
  SubAgentResult,
} from "@/features/pipeline/types";

// ── Tracing ─────────────────────────────────────────────────────────

async function trackStep<T>(
  traces: NodeTrace[],
  name: string,
  fn: () => T | Promise<T>,
): Promise<T> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  try {
    const result = await fn();
    const successTrace: NodeTrace = {
      nodeName: name,
      startedAt,
      durationMs: Date.now() - startMs,
    };
    traces.push(successTrace);
    return result;
  } catch (err) {
    const errorTrace: NodeTrace = {
      nodeName: name,
      startedAt,
      durationMs: Date.now() - startMs,
      error: err instanceof Error ? err.message : String(err),
    };
    traces.push(errorTrace);
    throw err;
  }
}

// ── Main Orchestrator ───────────────────────────────────────────────

export class ReviewPipelineService {
  constructor(
    private readonly reviewRepo: IReviewRepository,
    private readonly listingRepo: IListingRepository,
    private readonly violationRepo: IViolationRepository,
    private readonly policyRouter: PolicyRouterService,
    private readonly agentFactory: IAgentFactory,
    private readonly explainer: ExplainerService,
  ) {}

  async processReview(reviewId: string, tenantId: string): Promise<void> {
    const traces: NodeTrace[] = [];
    const tokenTracker = new TokenTracker();

    try {
      await this.reviewRepo.updateStatus(reviewId, "routing");

      const { listing } = await trackStep(traces, "fetch", () =>
        this.fetchReviewAndListing(reviewId),
      );

      const dispatchPlans = await trackStep(traces, "routing", () =>
        this.policyRouter.planAgentDispatch(listing, tenantId),
      );

      const agentResults = await trackStep(traces, "scanning", () =>
        this.runAgents(dispatchPlans, {
          reviewId,
          listing,
          tokenTracker,
        }),
      );

      const { decision, explanation } = await trackStep(
        traces,
        "aggregating",
        () => this.aggregateAndExplain(agentResults, listing, tokenTracker),
      );

      await trackStep(traces, "persist", () =>
        this.persistVerdict(reviewId, decision, explanation, { traces }),
      );
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      try {
        await this.reviewRepo.updateStatus(reviewId, "failed", {
          traces,
          error: errorMessage,
        });
      } catch {
        console.error(`Failed to update review ${reviewId} to failed status`);
      }
      throw err;
    }
  }

  private async fetchReviewAndListing(
    reviewId: string,
  ): Promise<ReviewWithListing> {
    const review = await this.reviewRepo.getById(reviewId);
    if (!review) {
      throw new DatabaseError(`Review not found: ${reviewId}`);
    }

    const listing = await this.listingRepo.getById(review.listing_id);
    if (!listing) {
      throw new DatabaseError(`Listing not found: ${review.listing_id}`);
    }

    const result: ReviewWithListing = { review, listing };
    return result;
  }

  private async runAgents(
    dispatchPlans: AgentDispatchPlan[],
    input: AgentInput,
  ): Promise<SubAgentResult[]> {
    const results: SubAgentResult[] = await Promise.all(
      dispatchPlans.map((plan) =>
        this.agentFactory.createPolicyAgent(
          plan.agentConfig,
          plan.relevantPolicies,
        )(input),
      ),
    );
    return results;
  }

  private async aggregateAndExplain(
    agentResults: SubAgentResult[],
    listing: ListingRow,
    tokenTracker?: TokenTracker,
  ): Promise<AggregationResult> {
    const decision = aggregateResults(agentResults);
    const explanation = await this.explainer.explain({
      decision,
      listing,
      agentResults,
      tokenTracker,
    });

    const result: AggregationResult = { decision, explanation };
    return result;
  }

  private async persistVerdict(
    reviewId: string,
    decision: AggregatedDecision,
    explanation: string,
    trace: Record<string, unknown>,
  ): Promise<void> {
    await executeInTransaction(async (client) => {
      await this.reviewRepo.updateVerdict(
        reviewId,
        decision.verdict,
        decision.confidence,
        explanation,
        trace,
        client,
      );
      if (decision.violations.length > 0) {
        await this.violationRepo.insertMany(
          reviewId,
          decision.violations,
          client,
        );
      }
    });
  }
}
