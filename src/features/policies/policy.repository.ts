import { BaseRepository } from "@/lib/db/base.repository";
import { ValidationError } from "@/lib/errors";

export interface PolicyMatch {
  sourceFile: string;
  content: string;
  similarity: number;
}

interface PolicySearchRow {
  source_file: string;
  content: string;
  similarity: number;
}

export interface IPolicyRepository {
  searchByEmbedding(
    tenantId: string,
    embedding: number[],
    sourceFiles: string[],
    limit?: number,
  ): Promise<PolicyMatch[]>;
}

const SEARCH_ALL_SQL = `WITH q AS (SELECT $1::vector AS v)
  SELECT source_file, content, 1 - (embedding <=> q.v) AS similarity
  FROM tenant_policy_chunks, q
  WHERE tenant_id = $2
  ORDER BY embedding <=> q.v
  LIMIT $3`;

const SEARCH_BY_FILES_SQL = `WITH q AS (SELECT $1::vector AS v)
  SELECT source_file, content, 1 - (embedding <=> q.v) AS similarity
  FROM tenant_policy_chunks, q
  WHERE tenant_id = $2 AND source_file = ANY($3)
  ORDER BY embedding <=> q.v
  LIMIT $4`;

function toPolicyMatch(row: PolicySearchRow): PolicyMatch {
  return {
    sourceFile: row.source_file,
    content: row.content,
    similarity: row.similarity,
  };
}

export class PolicyRepository
  extends BaseRepository
  implements IPolicyRepository
{
  async searchByEmbedding(
    tenantId: string,
    embedding: number[],
    sourceFiles: string[],
    limit = 5,
  ): Promise<PolicyMatch[]> {
    if (!Array.isArray(embedding) || embedding.length === 0) {
      throw new ValidationError("embedding must be a non-empty array");
    }

    const vector = `[${embedding.join(",")}]`;

    if (sourceFiles.length === 0) {
      const rows = await this.query<PolicySearchRow>(SEARCH_ALL_SQL, [
        vector,
        tenantId,
        limit,
      ]);
      return rows.map(toPolicyMatch);
    }

    const rows = await this.query<PolicySearchRow>(SEARCH_BY_FILES_SQL, [
      vector,
      tenantId,
      sourceFiles,
      limit,
    ]);
    return rows.map(toPolicyMatch);
  }
}
