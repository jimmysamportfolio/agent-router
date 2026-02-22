import type { AgentInput, SubAgentResult } from "@/server/pipeline/types";

export function checkImages(input: AgentInput): SubAgentResult {
  const hasImages =
    input.listing.image_urls !== null && input.listing.image_urls.length > 0;

  return {
    agentName: "image-analysis",
    verdict: "approved",
    confidence: hasImages ? 0.5 : 0.5,
    violations: [],
    reasoning: hasImages
      ? "Image analysis stub: images present but vision analysis not yet implemented."
      : "No images provided for analysis.",
  };
}
