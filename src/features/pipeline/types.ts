import type { ListingRow } from "@/features/listings";
import type { Severity, Verdict } from "@/types";
import type { TokenTracker } from "@/features/pipeline/guardrails/budget";
import type { PolicyMatch } from "@/features/policies";

export interface PipelineResult {
  verdict: Verdict;
  confidence: number;
  explanation: string;
  violations: AgentViolation[];
  traces: NodeTrace[];
}

export interface AgentInput {
  listing: ListingRow;
  tokenTracker?: TokenTracker;
}

export interface ExplainerInput {
  decision: AggregatedDecision;
  listing: ListingRow;
  agentResults: SubAgentResult[];
  tokenTracker?: TokenTracker | undefined;
}

export interface AggregationResult {
  decision: AggregatedDecision;
  explanation: string;
}

export interface SubAgentResult {
  agentName: string;
  verdict: Verdict;
  confidence: number;
  violations: AgentViolation[];
  reasoning: string;
}

export interface AgentViolation {
  policySection: string;
  severity: Severity;
  description: string;
}

export interface AggregatedDecision {
  verdict: Verdict;
  confidence: number;
  violations: AgentViolation[];
}

export interface NodeTrace {
  nodeName: string;
  startedAt: string;
  durationMs: number;
  error?: string;
}

export interface AgentConfig {
  id: string;
  tenantId: string;
  name: string;
  displayName: string;
  systemPromptTemplate: string;
  policySourceFiles: string[];
}

export interface AgentDispatchPlan {
  agentConfig: AgentConfig;
  relevantPolicies: PolicyMatch[];
}
