import type {
  AgentConfig,
  AgentInput,
  SubAgentResult,
} from "@/features/pipeline/types";
import type { PolicyMatch } from "@/features/policies/types";

export type PolicyAgent = (input: AgentInput) => Promise<SubAgentResult>;

export interface IAgentFactory {
  createPolicyAgent(config: AgentConfig, policies: PolicyMatch[]): PolicyAgent;
}
