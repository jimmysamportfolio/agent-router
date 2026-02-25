import {
  getReviewById,
  updateReviewStatus,
  updateReviewVerdict,
} from "@/lib/db/queries/reviews";
import { getListingById } from "@/lib/db/queries/listings";
import { insertViolations } from "@/lib/db/queries/violations";
import { executeInTransaction } from "@/lib/db/pool";
import { DatabaseError } from "@/lib/errors";
import { planAgentDispatch } from "@/server/pipeline/router";
import { createPolicyAgent } from "@/server/pipeline/agents/factory";
import { aggregateResults } from "@/server/pipeline/aggregator";
import { explainDecision } from "@/server/pipeline/explainer";
import { TokenTracker } from "@/server/pipeline/guardrails/budget";
import type { ListingRow } from "@/lib/types";
import type {
  AgentDispatchPlan,
  AgentInput,
  AggregatedDecision,
  AggregationResult,
  NodeTrace,
  ReviewWithListing,
  SubAgentResult,
} from "@/server/pipeline/types";

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

// ── Pipeline steps ──────────────────────────────────────────────────

async function fetchReviewAndListing(
  reviewId: string,
): Promise<ReviewWithListing> {
  const review = await getReviewById(reviewId);
  if (!review) {
    throw new DatabaseError(`Review not found: ${reviewId}`);
  }

  const listing = await getListingById(review.listing_id);
  if (!listing) {
    throw new DatabaseError(`Listing not found: ${review.listing_id}`);
  }

  const result: ReviewWithListing = { review, listing };
  return result;
}

async function runAgents(
  dispatchPlans: AgentDispatchPlan[],
  input: AgentInput,
): Promise<SubAgentResult[]> {
  const results: SubAgentResult[] = await Promise.all(
    dispatchPlans.map((plan) =>
      createPolicyAgent(plan.agentConfig, plan.relevantPolicies)(input),
    ),
  );
  return results;
}

async function aggregateAndExplain(
  agentResults: SubAgentResult[],
  listing: ListingRow,
  tokenTracker?: TokenTracker,
): Promise<AggregationResult> {
  const decision = aggregateResults(agentResults);
  const explanation = await explainDecision({
    decision,
    listing,
    agentResults,
    tokenTracker,
  });

  const result: AggregationResult = { decision, explanation };
  return result;
}

async function persistVerdict(
  reviewId: string,
  decision: AggregatedDecision,
  explanation: string,
  trace: Record<string, unknown>,
): Promise<void> {
  await executeInTransaction(async (client) => {
    await updateReviewVerdict(
      reviewId,
      decision.verdict,
      decision.confidence,
      explanation,
      trace,
      client,
    );
    if (decision.violations.length > 0) {
      await insertViolations(reviewId, decision.violations, client);
    }
  });
}

// ── Main orchestrator ───────────────────────────────────────────────

export async function processReview(
  reviewId: string,
  tenantId: string,
): Promise<void> {
  const traces: NodeTrace[] = [];
  const tokenTracker = new TokenTracker();

  try {
    await updateReviewStatus(reviewId, "routing");

    const { listing } = await trackStep(traces, "fetch", () =>
      fetchReviewAndListing(reviewId),
    );

    const dispatchPlans = await trackStep(traces, "routing", () =>
      planAgentDispatch(listing, tenantId),
    );

    const agentResults = await trackStep(traces, "scanning", () =>
      runAgents(dispatchPlans, { reviewId, listing, tokenTracker }),
    );

    const { decision, explanation } = await trackStep(
      traces,
      "aggregating",
      () => aggregateAndExplain(agentResults, listing, tokenTracker),
    );

    await trackStep(traces, "persist", () =>
      persistVerdict(reviewId, decision, explanation, { traces }),
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    try {
      await updateReviewStatus(reviewId, "failed", {
        traces,
        error: errorMessage,
      });
    } catch {
      console.error(`Failed to update review ${reviewId} to failed status`);
    }
    throw err;
  }
}
