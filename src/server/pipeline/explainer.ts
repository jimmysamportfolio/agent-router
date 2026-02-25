import { callClaude } from "@/server/pipeline/llm";
import type { ExplainerInput, SubAgentResult } from "@/server/pipeline/types";
import type { AggregatedDecision } from "@/server/pipeline/types";
import type { ListingRow } from "@/lib/types";

const EXPLAINER_SYSTEM_PROMPT = `You are a marketplace policy compliance explainer. Given a review decision, the listing details, and the reasoning from individual review agents, write a concise 2-3 sentence explanation of why the listing was approved, rejected, or escalated. Be specific about which policies were relevant. Write for a human reviewer who needs to quickly understand the decision.`;

const EXPLAINER_MAX_TOKENS = 256;

function formatAgentSummaries(results: SubAgentResult[]): string {
  return results
    .map(
      (r) =>
        `${r.agentName}: ${r.verdict} (confidence: ${r.confidence.toFixed(2)}) — ${r.reasoning}`,
    )
    .join("\n");
}

function formatViolationSummary(decision: AggregatedDecision): string {
  if (decision.violations.length === 0) return "None";
  return decision.violations
    .map((v) => `- [${v.severity}] ${v.policySection}: ${v.description}`)
    .join("\n");
}

function buildExplainerUserPrompt(
  decision: AggregatedDecision,
  listing: ListingRow,
  results: SubAgentResult[],
): string {
  const violationSummary = formatViolationSummary(decision);
  const agentSummaries = formatAgentSummaries(results);

  const userPrompt = `Listing: "${listing.title}"
Description: ${listing.description}
Category: ${listing.category}

Decision: ${decision.verdict} (confidence: ${decision.confidence.toFixed(2)})

Violations:
${violationSummary}

Agent Analysis:
${agentSummaries}

Write a 2-3 sentence explanation of this decision.`;

  return userPrompt;
}

export async function explainDecision(input: ExplainerInput): Promise<string> {
  const { decision, listing, agentResults, tokenTracker } = input;

  const userPrompt = buildExplainerUserPrompt(decision, listing, agentResults);

  const { text, tokensUsed } = await callClaude(
    EXPLAINER_SYSTEM_PROMPT,
    userPrompt,
    { maxTokens: EXPLAINER_MAX_TOKENS },
  );

  tokenTracker?.add(tokensUsed);

  return text;
}
