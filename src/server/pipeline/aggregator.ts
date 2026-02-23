import type {
  SubAgentResult,
  AggregatedDecision,
  AgentViolation,
} from "@/server/pipeline/types";

const REJECTION_CONFIDENCE_THRESHOLD = 0.7;
const APPROVAL_CONFIDENCE_THRESHOLD = 0.8;

function averageConfidence(results: SubAgentResult[]): number {
  if (results.length === 0) return 0;
  return results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
}

function collectViolations(results: SubAgentResult[]): AgentViolation[] {
  return results.flatMap((r) => r.violations);
}

export function aggregateResults(
  results: SubAgentResult[],
): AggregatedDecision {
  if (results.length === 0) {
    return { verdict: "escalated", confidence: 0, violations: [] };
  }

  const violations = collectViolations(results);

  const highConfidenceRejections = results.filter(
    (r) =>
      r.verdict === "rejected" && r.confidence > REJECTION_CONFIDENCE_THRESHOLD,
  );
  if (highConfidenceRejections.length > 0) {
    return {
      verdict: "rejected",
      confidence: averageConfidence(highConfidenceRejections),
      violations,
    };
  }

  const allApproved = results.every((r) => r.verdict === "approved");
  const avgConfidence = averageConfidence(results);

  if (allApproved && avgConfidence > APPROVAL_CONFIDENCE_THRESHOLD) {
    return { verdict: "approved", confidence: avgConfidence, violations };
  }

  return { verdict: "escalated", confidence: avgConfidence, violations };
}
