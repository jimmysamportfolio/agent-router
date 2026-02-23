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
import { checkImages } from "@/server/pipeline/agents/image-analysis";
import { aggregateResults } from "@/server/pipeline/aggregator";
import { explainDecision } from "@/server/pipeline/explainer";
import type { ListingRow } from "@/lib/types";
import type {
  AgentDispatchPlan,
  AgentInput,
  AggregatedDecision,
  NodeTrace,
  SubAgentResult,
} from "@/server/pipeline/types";

async function trackStep<T>(
  traces: NodeTrace[],
  name: string,
  fn: () => T | Promise<T>,
): Promise<T> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  try {
    const result = await fn();
    traces.push({
      nodeName: name,
      startedAt,
      durationMs: Date.now() - startMs,
    });
    return result;
  } catch (err) {
    const trace: NodeTrace = {
      nodeName: name,
      startedAt,
      durationMs: Date.now() - startMs,
    };
    trace.error = err instanceof Error ? err.message : String(err);
    traces.push(trace);
    throw err;
  }
}

// ── Pipeline steps ──────────────────────────────────────────────────

async function fetchReviewAndListing(reviewId: string) {
  const review = await getReviewById(reviewId);
  if (!review) throw new DatabaseError(`Review not found: ${reviewId}`);

  const listing = await getListingById(review.listing_id);
  if (!listing)
    throw new DatabaseError(`Listing not found: ${review.listing_id}`);

  return { review, listing };
}

async function runAgents(
  dispatchPlans: AgentDispatchPlan[],
  input: AgentInput,
): Promise<SubAgentResult[]> {
  const policyAgents = dispatchPlans.map((plan) =>
    createPolicyAgent(plan.agentConfig, plan.relevantPolicies)(input),
  );
  return Promise.all([...policyAgents, checkImages(input)]);
}

async function aggregateAndExplain(
  results: SubAgentResult[],
  listing: ListingRow,
) {
  const decision = aggregateResults(results);
  const explanation = await explainDecision(decision, listing, results);
  return { decision, explanation };
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

  try {
    await updateReviewStatus(reviewId, "routing");

    const { listing } = await trackStep(traces, "fetch", () =>
      fetchReviewAndListing(reviewId),
    );

    const dispatchPlans = await trackStep(traces, "routing", () =>
      planAgentDispatch(listing, tenantId),
    );

    const agentResults = await trackStep(traces, "scanning", () =>
      runAgents(dispatchPlans, { reviewId, listing }),
    );

    const { decision, explanation } = await trackStep(
      traces,
      "aggregating",
      () => aggregateAndExplain(agentResults, listing),
    );

    await trackStep(traces, "persist", () =>
      persistVerdict(reviewId, decision, explanation, { traces }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    try {
      await updateReviewStatus(reviewId, "failed", { traces, error: message });
    } catch {
      console.error(`Failed to update review ${reviewId} to failed status`);
    }
    throw err;
  }
}
