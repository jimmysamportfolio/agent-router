import type { ListingRow } from "@/features/listings";
import type { TokenTracker } from "@/features/pipeline/guardrails/budget";
import type { PolicyMatch } from "@/features/policies";
import type { Verdict } from "@/features/reviews/repositories/review-repository";
import type { Severity } from "@/features/reviews/repositories/violation-repository";

export interface AgentConfigRow {
  id: string;
  tenant_id: string;
  name: string;
  display_name: string;
  system_prompt_template: string;
  policy_source_files: string[];
  options: Record<string, unknown>;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

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
  options: Record<string, unknown>;
}

export interface AgentDispatchPlan {
  agentConfig: AgentConfig;
  relevantPolicies: PolicyMatch[];
}
