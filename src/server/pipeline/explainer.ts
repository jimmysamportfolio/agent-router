import { callClaude } from "@/server/pipeline/llm";
import type { ListingRow } from "@/lib/types";
import type {
  AggregatedDecision,
  SubAgentResult,
} from "@/server/pipeline/types";

const SYSTEM_PROMPT = `You are a marketplace policy compliance explainer. Given a review decision, the listing details, and the reasoning from individual review agents, write a concise 2-3 sentence explanation of why the listing was approved, rejected, or escalated. Be specific about which policies were relevant. Write for a human reviewer who needs to quickly understand the decision.`;

export async function explainDecision(
  decision: AggregatedDecision,
  listing: ListingRow,
  results: SubAgentResult[],
): Promise<string> {
  const agentSummaries = results
    .map(
      (r) =>
        `${r.agentName}: ${r.verdict} (confidence: ${r.confidence.toFixed(2)}) — ${r.reasoning}`,
    )
    .join("\n");

  const violationSummary =
    decision.violations.length > 0
      ? decision.violations
          .map((v) => `- [${v.severity}] ${v.policySection}: ${v.description}`)
          .join("\n")
      : "None";

  const userPrompt = `Listing: "${listing.title}"
Description: ${listing.description}
Category: ${listing.category}

Decision: ${decision.verdict} (confidence: ${decision.confidence.toFixed(2)})

Violations:
${violationSummary}

Agent Analysis:
${agentSummaries}

Write a 2-3 sentence explanation of this decision.`;

  return callClaude(SYSTEM_PROMPT, userPrompt, { maxTokens: 256 });
}
