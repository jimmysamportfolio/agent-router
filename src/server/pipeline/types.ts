import type { ListingRow, Severity, Verdict } from "@/lib/types";
import type { TokenTracker } from "@/server/pipeline/guardrails/budget";

/** Result from an LLM text completion */
export interface LLMTextResult {
  text: string;
  tokensUsed: number;
}

/** Result from an LLM structured (tool) completion */
export interface LLMStructuredResult<T> {
  data: T;
  tokensUsed: number;
}

/** Input passed to each sub-agent for analysis */
export interface AgentInput {
  reviewId: string;
  listing: ListingRow;
  tokenTracker?: TokenTracker;
}

/** A policy chunk matched by vector search */
export interface PolicyMatch {
  sourceFile: string;
  content: string;
  similarity: number;
}

/** Result returned by each sub-agent */
export interface SubAgentResult {
  agentName: string;
  verdict: Verdict;
  confidence: number;
  violations: AgentViolation[];
  reasoning: string;
}

/** Violation identified by a sub-agent (before DB insertion) */
export interface AgentViolation {
  policySection: string;
  severity: Severity;
  description: string;
}

/** Final aggregated decision from all sub-agents */
export interface AggregatedDecision {
  verdict: Verdict;
  confidence: number;
  violations: AgentViolation[];
}

/** Trace entry for pipeline observability */
export interface NodeTrace {
  nodeName: string;
  startedAt: string;
  durationMs: number;
  error?: string;
}

/** Configuration for a dynamically-created policy agent */
export interface AgentConfig {
  id: string;
  tenantId: string;
  name: string;
  displayName: string;
  systemPromptTemplate: string;
  policySourceFiles: string[];
  options: AgentOptions;
}

/** Options that control agent behavior */
export interface AgentOptions {
  skipRedaction?: boolean;
  maxTokens?: number;
}

/** A dispatch plan pairing an agent config with its relevant policies */
export interface AgentDispatchPlan {
  agentConfig: AgentConfig;
  relevantPolicies: PolicyMatch[];
}
