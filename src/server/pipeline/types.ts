import type { ListingRow, Severity, Verdict } from "@/lib/types";

/** Input passed to each sub-agent for analysis */
export interface AgentInput {
  reviewId: string;
  listing: ListingRow;
  relevantPolicies: PolicyMatch[];
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
