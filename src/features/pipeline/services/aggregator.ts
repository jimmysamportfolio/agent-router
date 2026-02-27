import { InvariantError } from "@/lib/errors";
import type {
  SubAgentResult,
  AggregatedDecision,
  AgentViolation,
} from "@/features/pipeline/types";

const REJECTION_CONFIDENCE_THRESHOLD = 0.7;
const APPROVAL_CONFIDENCE_THRESHOLD = 0.8;

function calculateAverageConfidence(results: SubAgentResult[]): number {
  if (results.length === 0) return 0;
  const totalConfidence = results.reduce((sum, r) => sum + r.confidence, 0);
  return totalConfidence / results.length;
}

function collectAllViolations(results: SubAgentResult[]): AgentViolation[] {
  return results.flatMap((r) => r.violations);
}

export function aggregateResults(
  results: SubAgentResult[],
): AggregatedDecision {
  if (results.length === 0) {
    throw new InvariantError(
      "Cannot aggregate empty results — all agents failed",
    );
  }

  const violations = collectAllViolations(results);

  const highConfidenceRejections = results.filter(
    (r) =>
      r.verdict === "rejected" && r.confidence > REJECTION_CONFIDENCE_THRESHOLD,
  );
  if (highConfidenceRejections.length > 0) {
    const rejectedDecision: AggregatedDecision = {
      verdict: "rejected",
      confidence: calculateAverageConfidence(highConfidenceRejections),
      violations,
    };
    return rejectedDecision;
  }

  const allApproved = results.every((r) => r.verdict === "approved");
  const averageConfidence = calculateAverageConfidence(results);

  if (allApproved && averageConfidence > APPROVAL_CONFIDENCE_THRESHOLD) {
    const approvedDecision: AggregatedDecision = {
      verdict: "approved",
      confidence: averageConfidence,
      violations,
    };
    return approvedDecision;
  }

  const escalatedDecision: AggregatedDecision = {
    verdict: "escalated",
    confidence: averageConfidence,
    violations,
  };
  return escalatedDecision;
}
