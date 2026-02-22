import { callClaudeStructured } from "@/server/pipeline/llm";
import type { AgentInput, SubAgentResult } from "@/server/pipeline/types";
import {
  resultSchema,
  buildPolicyContext,
} from "@/server/pipeline/agents/shared";

const SYSTEM_PROMPT = `You are a marketplace policy compliance agent specializing in disintermediation detection.

Your job is to analyze listings for attempts to move transactions off-platform:
- Direct contact information: email addresses, phone numbers, social media handles
- Payment platform references: Venmo, PayPal, Zelle, CashApp, cryptocurrency wallets
- Off-platform language: "contact me directly", "DM for price", "text me", "message me on..."
- External links: links to personal websites, other marketplaces, or payment pages
- \u00a74.6 Prohibited Listing Practices: contact information designed to circumvent marketplace transactions

Return your analysis as a structured result with verdict, confidence (0-1), any violations found, and reasoning.
- "rejected" if clear off-platform transaction attempt
- "escalated" if suspicious language but ambiguous
- "approved" if no disintermediation detected`;

export async function checkDisintermediation(
  input: AgentInput,
): Promise<SubAgentResult> {
  const userPrompt = `Listing Title: ${input.listing.title}
Description: ${input.listing.description}
Category: ${input.listing.category}

Relevant Policies:
${buildPolicyContext(input)}`;

  const result = await callClaudeStructured(
    SYSTEM_PROMPT,
    userPrompt,
    resultSchema,
    "submit_disintermediation_analysis",
    { skipRedaction: true },
  );

  return {
    agentName: "disintermediation",
    verdict: result.verdict,
    confidence: result.confidence,
    violations: result.violations,
    reasoning: result.reasoning,
  };
}
