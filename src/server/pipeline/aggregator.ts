import type {
  SubAgentResult,
  AggregatedDecision,
  AgentViolation,
} from "@/server/pipeline/types";

const SEVERITY_RANKS: Record<string, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
};

function severityRank(severity: string): number {
  return SEVERITY_RANKS[severity] ?? 0;
}

export function aggregateResults(
  results: SubAgentResult[],
): AggregatedDecision {
  if (results.length === 0) {
    return { verdict: "escalated", confidence: 0, violations: [] };
  }

  // Merge and deduplicate violations by policySection
  const violationMap = new Map<string, AgentViolation>();
  for (const result of results) {
    for (const v of result.violations) {
      const existing = violationMap.get(v.policySection);
      if (
        !existing ||
        severityRank(v.severity) > severityRank(existing.severity)
      ) {
        violationMap.set(v.policySection, v);
      }
    }
  }
  const violations = [...violationMap.values()];

  // If ANY agent rejected with confidence > 0.7 → rejected
  const hasHighConfidenceRejection = results.some(
    (r) => r.verdict === "rejected" && r.confidence > 0.7,
  );
  if (hasHighConfidenceRejection) {
    const rejections = results.filter(
      (r) => r.verdict === "rejected" && r.confidence > 0.7);
    const avgConfidence =
      rejections.reduce((sum, r) => sum + r.confidence, 0) / rejections.length;
    return { verdict: "rejected", confidence: avgConfidence, violations };
  }

  // If ALL approved with avg confidence > 0.8 → approved
  const allApproved = results.every((r) => r.verdict === "approved");
  if (allApproved) {
    const avgConfidence =
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    if (avgConfidence > 0.8) {
      return { verdict: "approved", confidence: avgConfidence, violations };
    }
  }

  // Otherwise → escalated
  const avgConfidence =
    results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
  return { verdict: "escalated", confidence: avgConfidence, violations };
}

