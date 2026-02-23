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
import type { AgentInput, NodeTrace } from "@/server/pipeline/types";

function traceNode(
  nodeName: string,
  startedAt: string,
  startMs: number,
  error?: string,
): NodeTrace {
  const trace: NodeTrace = {
    nodeName,
    startedAt,
    durationMs: Date.now() - startMs,
  };
  if (error !== undefined) {
    trace.error = error;
  }
  return trace;
}

export async function processReview(
  reviewId: string,
  tenantId: string,
): Promise<void> {
  const traces: NodeTrace[] = [];

  try {
    // Fetch review + listing
    let start = Date.now();
    let startedAt = new Date().toISOString();

    const review = await getReviewById(reviewId);
    if (!review) throw new DatabaseError(`Review not found: ${reviewId}`);

    const listing = await getListingById(review.listing_id);
    if (!listing)
      throw new DatabaseError(`Listing not found: ${review.listing_id}`);

    traces.push(traceNode("fetch", startedAt, start));

    // Route — plan dynamic agent dispatch
    start = Date.now();
    startedAt = new Date().toISOString();
    await updateReviewStatus(reviewId, "routing", { traces });

    const dispatchPlans = await planAgentDispatch(listing, tenantId);
    traces.push(traceNode("routing", startedAt, start));

    // Scan with dynamic agents + built-in image analysis
    start = Date.now();
    startedAt = new Date().toISOString();
    await updateReviewStatus(reviewId, "scanning", { traces });

    const agentInput: AgentInput = {
      reviewId,
      listing,
      relevantPolicies: [],
    };

    const dynamicAgentPromises = dispatchPlans.map((plan) =>
      createPolicyAgent(plan.agentConfig, plan.relevantPolicies)(agentInput),
    );

    const agentResults = await Promise.all([
      ...dynamicAgentPromises,
      checkImages(agentInput),
    ]);
    traces.push(traceNode("scanning", startedAt, start));

    // Aggregate
    start = Date.now();
    startedAt = new Date().toISOString();
    await updateReviewStatus(reviewId, "aggregating", { traces });

    const decision = aggregateResults(agentResults);
    const explanation = await explainDecision(decision, listing, agentResults);
    traces.push(traceNode("aggregating", startedAt, start));

    // Persist verdict + violations in transaction
    start = Date.now();
    startedAt = new Date().toISOString();

    await executeInTransaction(async (client) => {
      await updateReviewVerdict(
        reviewId,
        decision.verdict,
        decision.confidence,
        explanation,
        { traces },
        client,
      );

      if (decision.violations.length > 0) {
        await insertViolations(reviewId, decision.violations, client);
      }
    });

    traces.push(traceNode("persist", startedAt, start));
    await updateReviewVerdict(
      reviewId,
      decision.verdict,
      decision.confidence,
      explanation,
      { traces },
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    traces.push(
      traceNode("error", new Date().toISOString(), Date.now(), errorMessage),
    );

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
