export interface PolicyChunk {
  sourceFile: string;
  chunkIndex: number;
  content: string;
  metadata: { sections: string[] };
}

export interface TenantPolicyChunkRow {
  id: string;
  tenant_id: string;
  source_file: string;
  chunk_index: number;
  content: string;
  embedding: number[];
  metadata: Record<string, unknown>;
}
