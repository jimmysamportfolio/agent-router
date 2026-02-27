import type { IPolicyRepository } from "@/lib/db/repositories/policy.repository";
import type { PolicyMatch } from "@/features/policies/types";

export class PolicyService {
  constructor(private readonly policyRepo: IPolicyRepository) {}

  async searchByEmbedding(
    tenantId: string,
    embedding: number[],
    sourceFiles: string[],
    limit?: number,
  ): Promise<PolicyMatch[]> {
    const rows = await this.policyRepo.searchByEmbedding(
      tenantId,
      embedding,
      sourceFiles,
      limit,
    );

    return rows.map((row) => {
      const match: PolicyMatch = {
        sourceFile: row.source_file,
        content: row.content,
        similarity: row.similarity,
      };
      return match;
    });
  }
}
