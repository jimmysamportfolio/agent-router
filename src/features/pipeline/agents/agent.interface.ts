import type {
  AgentConfig,
  AgentInput,
  PolicyMatch,
  SubAgentResult,
} from "@/features/pipeline/types";

export type PolicyAgent = (input: AgentInput) => Promise<SubAgentResult>;

export interface IAgentFactory {
  createPolicyAgent(config: AgentConfig, policies: PolicyMatch[]): PolicyAgent;
}
