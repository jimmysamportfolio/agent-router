# Service Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + React 19 |
| API | tRPC v11 + @tanstack/react-query v5 |
| Database | PostgreSQL 16 + pgvector |
| Cache/Queue | Redis 7 + BullMQ v5 |
| LLM | Anthropic Claude SDK |
| Embeddings | Google Gemini (`gemini-embedding-001`, 768-dim) |
| Validation | Zod v4 |
| Styling | Tailwind CSS 4 |

## Request Flow

```
Client → Next.js App Router → tRPC route handler
  → tRPC procedure (validate via Zod)
    → INSERT listing + review (pending)
    → Enqueue job (BullMQ/Redis)
    → Return reviewId

Worker picks up job:
  1. Router: classify listing → vector search policy_chunks
  2. Sub-agents: specialized checks (prohibited, counterfeit, health-claims, image-analysis)
  3. Aggregator: merge sub-agent results → verdict + confidence
  4. Explainer: generate human-readable explanation
  5. Persist: UPDATE review (status, verdict, trace), INSERT violations
  6. Fire webhooks to registered consumers
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| DATABASE_URL | Yes | PostgreSQL connection string |
| REDIS_URL | Yes | Redis connection string |
| ANTHROPIC_API_KEY | Yes | Claude API key |
| GEMINI_API_KEY | Yes | Google Gemini for embeddings |
| DB_POOL_MAX | No | Pool size (default 10) |
| DB_CONN_TIMEOUT_MS | No | Connection timeout (default 5000) |
| DB_IDLE_TIMEOUT_MS | No | Idle timeout (default 30000) |
| QUEUE_PROVIDER | No | `bullmq` (default) or `sqs` |

## Embedding Pipeline

- Model: `gemini-embedding-001` (768 dimensions)
- Chunking: ~512 tokens per chunk, 64 token overlap, paragraph-boundary splits
- Storage: `policy_chunks` table with HNSW index for cosine similarity
- Seeding: `npm run dev:seed` reads `policies/*.md` → chunk → embed → store

## Policy Documents

Located in `policies/`:
- `prohibited_items.md` — weapons, drugs, hazmat, stolen goods
- `counterfeit_items.md` — counterfeits, trademark/copyright/patent
- `quality_standards.md` — title/description/image/pricing rules
- `restricted_categories.md` — age-restricted, medical, financial, automotive, food
