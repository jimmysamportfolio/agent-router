import { z } from "zod";
import { callClaudeStructured } from "@/server/pipeline/llm";
import { embedTexts } from "@/lib/utils/embedding";
import { searchPoliciesByEmbedding } from "@/lib/db/queries/policies";
import type { ListingRow } from "@/lib/types";
import type { PolicyMatch } from "@/server/pipeline/types";

const CATEGORIES = [
  "prohibited_items",
  "disintermediation",
  "health_claims",
  "counterfeit",
  "quality_standards",
] as const;

const classificationSchema = z.object({
  categories: z.array(z.enum(CATEGORIES)),
});

const SYSTEM_PROMPT = `You are a marketplace listing classifier. Given a listing's title, description, and category, identify which risk categories apply.

Available categories:
- prohibited_items: weapons, drugs, hazmat, stolen goods, human remains, protected wildlife
- disintermediation: attempts to move transactions off-platform (sharing contact info, mentioning Venmo/PayPal/etc)
- health_claims: medical claims, FDA references, supplement claims, therapeutic claims
- counterfeit: brand misuse, suspiciously low prices for branded goods, trademark issues
- quality_standards: title/description accuracy, image issues, pricing manipulation

Return ALL categories that could be relevant. When in doubt, include the category.`;

export interface RouteResult {
  categories: string[];
  relevantPolicies: PolicyMatch[];
}

export async function routeReview(listing: ListingRow): Promise<RouteResult> {
  const userPrompt = `Title: ${listing.title}\nDescription: ${listing.description}\nCategory: ${listing.category}`;

  // Classify listing into risk categories
  const classification = await callClaudeStructured(
    SYSTEM_PROMPT,
    userPrompt,
    classificationSchema,
    "classify_listing",
  );

  // Embed listing text for policy search
  const searchText = `${listing.title} ${listing.description}`;
  const [embedding] = await embedTexts([searchText]);
  if (!embedding) {
    return { categories: classification.categories, relevantPolicies: [] };
  }

  // Search for relevant policy chunks
  const results = await searchPoliciesByEmbedding(embedding, 10);
  const relevantPolicies: PolicyMatch[] = results.map((r) => ({
    sourceFile: r.source_file,
    content: r.content,
    similarity: r.similarity,
  }));

  return { categories: classification.categories, relevantPolicies };
}
