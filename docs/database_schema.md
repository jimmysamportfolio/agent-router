# Database Schema

## Migration System

- SQL files in `src/lib/db/migrations/` numbered `NNN_name.sql`
- Tracked in `_migrations` table (name + applied_at)
- Run via `npm run dev:migrate`
- Each migration executes in a transaction
- Add new migrations with next sequential number

## Enums (001)

```sql
review_status: pending | routing | scanning | aggregating | complete | escalated | failed
verdict:       approved | rejected | escalated
severity:      low | medium | high | critical
```

## Tables

### listings (002)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| title | TEXT NOT NULL | |
| description | TEXT NOT NULL | |
| category | TEXT NOT NULL | |
| image_urls | TEXT[] | default `{}` |
| metadata | JSONB | default `{}` |
| created_at | TIMESTAMPTZ | default `NOW()` |

### reviews (003)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| listing_id | UUID FK → listings | CASCADE delete |
| status | review_status | default `pending` |
| verdict | verdict | nullable |
| confidence | REAL | nullable |
| explanation | TEXT | nullable |
| trace | JSONB | default `{}` |
| created_at | TIMESTAMPTZ | default `NOW()` |
| updated_at | TIMESTAMPTZ | default `NOW()` |

Indexes: `status`, `listing_id`

### violations (004)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| review_id | UUID FK → reviews | CASCADE delete |
| policy_section | TEXT NOT NULL | |
| severity | severity NOT NULL | |
| description | TEXT NOT NULL | |

Index: `review_id`

### policy_chunks (005)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| source_file | TEXT NOT NULL | policy filename |
| chunk_index | INTEGER NOT NULL | position in source |
| content | TEXT NOT NULL | chunk text |
| embedding | vector(768) NOT NULL | Gemini embedding |
| metadata | JSONB | default `{}`, stores `{sections: [...]}` |

Constraints: UNIQUE `(source_file, chunk_index)`
Index: HNSW on `embedding` with `vector_cosine_ops`

### eval_runs (006)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| f1 | REAL NOT NULL | |
| precision_score | REAL NOT NULL | |
| recall | REAL NOT NULL | |
| latency_ms | INTEGER NOT NULL | |
| token_cost | REAL NOT NULL | |
| created_at | TIMESTAMPTZ | default `NOW()` |

### webhook_registrations (007)
| Column | Type | Notes |
|--------|------|-------|
| id | UUID PK | `gen_random_uuid()` |
| url | TEXT NOT NULL | |
| event_types | TEXT[] NOT NULL | default `{}` |
| secret | TEXT NOT NULL | AES-256-GCM encrypted |
| active | BOOLEAN NOT NULL | default `true` |
| created_at | TIMESTAMPTZ | default `NOW()` |

**Security**: `secret` stores encrypted ciphertext. App layer must encrypt with AES-256-GCM via envelope encryption (KMS/Vault) before storage. Decrypt only for HMAC signing.

## Query Patterns

```typescript
const rows = await query<MyRow>(sql, [param1, param2]);
const row = await queryOne<MyRow>(sql, [id]);
await executeInTransaction(async (client) => {
  await client.query(sql1, params1);
  await client.query(sql2, params2);
});
```

- Always parameterized (`$1`, `$2`, ...)
- Vector search: cast with `$1::vector`, use `<=>` for cosine distance
- Bulk inserts: build dynamic VALUES placeholders (see `policies.ts`)
