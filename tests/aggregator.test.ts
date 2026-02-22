import { aggregateResults } from "@/server/pipeline/aggregator";
import type { SubAgentResult } from "@/server/pipeline/types";

function makeResult(overrides: Partial<SubAgentResult> = {}): SubAgentResult {
  return {
    agentName: "test-agent",
    verdict: "approved",
    confidence: 0.9,
    violations: [],
    reasoning: "No issues found",
    ...overrides,
  };
}

describe("aggregateResults", () => {
  it("returns approved when all agents approve with high confidence", () => {
    const results = [
      makeResult({ agentName: "a", confidence: 0.95 }),
      makeResult({ agentName: "b", confidence: 0.9 }),
      makeResult({ agentName: "c", confidence: 0.85 }),
    ];
    const decision = aggregateResults(results);
    expect(decision.verdict).toBe("approved");
    expect(decision.confidence).toBeGreaterThan(0.8);
  });

  it("returns rejected when any agent rejects with confidence > 0.7", () => {
    const results = [
      makeResult({ agentName: "a" }),
      makeResult({
        agentName: "b",
        verdict: "rejected",
        confidence: 0.85,
        violations: [
          {
            policySection: "1.1",
            severity: "high",
            description: "Weapon detected",
          },
        ],
      }),
    ];
    const decision = aggregateResults(results);
    expect(decision.verdict).toBe("rejected");
  });

  it("returns escalated when rejection confidence is <= 0.7", () => {
    const results = [
      makeResult({ agentName: "a" }),
      makeResult({ agentName: "b", verdict: "rejected", confidence: 0.6 }),
    ];
    const decision = aggregateResults(results);
    expect(decision.verdict).toBe("escalated");
  });

  it("returns escalated when all approved but avg confidence <= 0.8", () => {
    const results = [
      makeResult({ agentName: "a", confidence: 0.7 }),
      makeResult({ agentName: "b", confidence: 0.75 }),
    ];
    const decision = aggregateResults(results);
    expect(decision.verdict).toBe("escalated");
  });

  it("returns escalated for empty results", () => {
    const decision = aggregateResults([]);
    expect(decision.verdict).toBe("escalated");
    expect(decision.confidence).toBe(0);
  });

  it("returns escalated when rejection confidence is exactly 0.7 (exclusive boundary)", () => {
    const results = [
      makeResult({ agentName: "a" }),
      makeResult({ agentName: "b", verdict: "rejected", confidence: 0.7 }),
    ];
    expect(aggregateResults(results).verdict).toBe("escalated");
  });

  it("returns escalated when all approved with avg confidence exactly 0.8 (exclusive boundary)", () => {
    const results = [
      makeResult({ agentName: "a", confidence: 0.8 }),
      makeResult({ agentName: "b", confidence: 0.8 }),
    ];
    expect(aggregateResults(results).verdict).toBe("escalated");
  });

  it("deduplicates violations by policySection keeping highest severity", () => {
    const results = [
      makeResult({
        agentName: "a",
        verdict: "rejected",
        confidence: 0.9,
        violations: [
          {
            policySection: "1.1",
            severity: "medium",
            description: "Low concern",
          },
        ],
      }),
      makeResult({
        agentName: "b",
        verdict: "rejected",
        confidence: 0.85,
        violations: [
          {
            policySection: "1.1",
            severity: "critical",
            description: "Major concern",
          },
        ],
      }),
    ];
    const decision = aggregateResults(results);
    expect(decision.violations).toHaveLength(1);
    expect(decision.violations[0]!.severity).toBe("critical");
  });

  it("calculates average confidence from rejecting agents for rejected verdict", () => {
    const results = [
      makeResult({ agentName: "a", verdict: "approved", confidence: 0.95 }),
      makeResult({ agentName: "b", verdict: "rejected", confidence: 0.8 }),
      makeResult({ agentName: "c", verdict: "rejected", confidence: 0.9 }),
    ];
    const decision = aggregateResults(results);
    expect(decision.verdict).toBe("rejected");
    expect(decision.confidence).toBeCloseTo(0.85);
  });
});
