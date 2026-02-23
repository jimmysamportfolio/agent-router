CREATE TABLE tenant_policy_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  source_file TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(768) NOT NULL,
  metadata    JSONB DEFAULT '{}',
  UNIQUE (tenant_id, source_file, chunk_index)
);

CREATE INDEX idx_tenant_policy_chunks_embedding
  ON tenant_policy_chunks USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_tenant_policy_chunks_tenant
  ON tenant_policy_chunks (tenant_id);
