CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE policy_chunks (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_file TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content     TEXT NOT NULL,
  embedding   vector(1536) NOT NULL,
  metadata    JSONB DEFAULT '{}',
  UNIQUE (source_file, chunk_index)
);

CREATE INDEX idx_policy_chunks_embedding
  ON policy_chunks USING hnsw (embedding vector_cosine_ops);
