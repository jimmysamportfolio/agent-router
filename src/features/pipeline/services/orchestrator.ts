import { InvariantError } from "@/lib/errors";
import type { AggregatorService } from "@/features/pipeline/services/aggregator";
import { TokenTracker } from "@/features/pipeline/guardrails/budget";
import type { PolicyRouterService } from "@/features/pipeline/services/router";
import type { IAgentFactory } from "@/features/pipeline/agents/agent.interface";
import type { ExplainerService } from "@/features/pipeline/services/explainer";
import type { ListingRow } from "@/types";
import type {
  AgentDispatchPlan,
  AgentInput,
  AggregationResult,
  NodeTrace,
  PipelineResult,
  SubAgentResult,
} from "@/features/pipeline/types";

// ── Tracing ─────────────────────────────────────────────────────────

async function trackStep<T>(
  traces: NodeTrace[],
  name: string,
  fn: () => T | Promise<T>,
): Promise<T> {
  const startedAt = new Date().toISOString();
  const startMs = Date.now();
  try {
    const result = await fn();
    const successTrace: NodeTrace = {
      nodeName: name,
      startedAt,
      durationMs: Date.now() - startMs,
    };
    traces.push(successTrace);
    return result;
  } catch (err) {
    const errorTrace: NodeTrace = {
      nodeName: name,
      startedAt,
      durationMs: Date.now() - startMs,
      error: err instanceof Error ? err.message : String(err),
    };
    traces.push(errorTrace);
    throw err;
  }
}

// ── Pure Pipeline Service ───────────────────────────────────────────

export class PipelineService {
  constructor(
    private readonly policyRouter: PolicyRouterService,
    private readonly agentFactory: IAgentFactory,
    private readonly explainer: ExplainerService,
    private readonly aggregator: AggregatorService,
  ) {}

  async process(
    listing: ListingRow,
    tenantId: string,
  ): Promise<PipelineResult> {
    const traces: NodeTrace[] = [];
    const tokenTracker = new TokenTracker();

    const dispatchPlans = await trackStep(traces, "routing", () =>
      this.policyRouter.planAgentDispatch(listing, tenantId),
    );

    const agentResults = await trackStep(traces, "scanning", () =>
      this.runAgents(dispatchPlans, { listing, tokenTracker }),
    );

    const { decision, explanation } = await trackStep(
      traces,
      "aggregating",
      () => this.aggregateAndExplain(agentResults, listing, tokenTracker),
    );

    const result: PipelineResult = {
      verdict: decision.verdict,
      confidence: decision.confidence,
      explanation,
      violations: decision.violations,
      traces,
    };
    return result;
  }

  private async runAgents(
    dispatchPlans: AgentDispatchPlan[],
    input: AgentInput,
  ): Promise<SubAgentResult[]> {
    const settled = await Promise.allSettled(
      dispatchPlans.map((plan) =>
        this.agentFactory.createPolicyAgent(
          plan.agentConfig,
          plan.relevantPolicies,
        )(input),
      ),
    );

    const results: SubAgentResult[] = [];
    const failures: string[] = [];

    for (let i = 0; i < settled.length; i++) {
      const outcome = settled[i]!;
      if (outcome.status === "fulfilled") {
        results.push(outcome.value);
      } else {
        const plan = dispatchPlans[i]!;
        const reason =
          outcome.reason instanceof Error
            ? outcome.reason.message
            : String(outcome.reason);
        console.error(`Agent ${plan.agentConfig.name} failed: ${reason}`);
        failures.push(plan.agentConfig.name);
      }
    }

    if (results.length === 0) {
      throw new InvariantError(`All agents failed: ${failures.join(", ")}`);
    }

    return results;
  }

  private async aggregateAndExplain(
    agentResults: SubAgentResult[],
    listing: ListingRow,
    tokenTracker?: TokenTracker,
  ): Promise<AggregationResult> {
    const decision = this.aggregator.aggregate(agentResults);
    const explanation = await this.explainer.explain({
      decision,
      listing,
      agentResults,
      tokenTracker,
    });

    const result: AggregationResult = { decision, explanation };
    return result;
  }
}
