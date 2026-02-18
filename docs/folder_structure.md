agentr/
├── .github/
│   └── workflows/
│       └── ci.yml
│
├── src/
│   ├── app/                             # FRONTEND — React pages, layouts
│   │   ├── layout.tsx
│   │   ├── page.tsx                     # landing page
│   │   ├── demo/
│   │   │   └── page.tsx                 # 3 pre-filled examples
│   │   ├── dashboard/
│   │   │   └── page.tsx                 # server component, polls in-progress
│   │   ├── review/
│   │   │   └── [id]/
│   │   │       └── page.tsx             # verdict + explanation + collapsible trace
│   │   ├── submit/
│   │   │   └── page.tsx                 # form → Zod → POST → redirect
│   │   ├── admin/
│   │   │   ├── evals/
│   │   │   │   └── page.tsx             # recharts placeholder
│   │   │   └── docs/
│   │   │       └── page.tsx             # API docs / policy viewer
│   │   └── api/                         # THIN EDGE — route handlers wire to server/
│   │       ├── trpc/
│   │       │   └── [trpc]/
│   │       │       └── route.ts         # tRPC catch-all handler
│   │       └── webhooks/
│   │           └── route.ts             # plain REST — external consumers
│   │
│   ├── components/                      # FRONTEND — reusable UI
│   │   ├── ui/                          # Radix+Tailwind wrappers
│   │   │   ├── button.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── input.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── select.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── tabs.tsx
│   │   ├── listing-card.tsx
│   │   ├── verdict-badge.tsx
│   │   ├── confidence-gauge.tsx
│   │   ├── violation-card.tsx
│   │   ├── trace-timeline.tsx
│   │   └── eval-chart.tsx
│   │
│   ├── hooks/                           # FRONTEND — client hooks
│   │   └── use-poll-status.ts           # polls scan status every 3s
│   │
│   ├── server/                          # BACKEND — all business logic, zero React
│   │   ├── trpc.ts                      # initTRPC, context (db pool, redis)
│   │   ├── root.ts                      # mergeRouters → appRouter, export type AppRouter
│   │   ├── routers/
│   │   │   ├── decisions.ts             # submit: validate → INSERT → enqueue → return reviewId
│   │   │   ├── scans.ts                 # get status by reviewId
│   │   │   └── evals.ts                 # placeholder for Phase 4
│   │   ├── pipeline/
│   │   │   ├── types.ts                 # AgentInput, SubAgentResult, AggregatedDecision, NodeTrace
│   │   │   ├── llm.ts                   # Claude wrapper: retries, timeout, Zod→tool_use
│   │   │   ├── router.ts               # classify + pgvector retrieval
│   │   │   ├── aggregator.ts
│   │   │   ├── explainer.ts
│   │   │   ├── orchestrator.ts          # entry point: reviewId → full pipeline → persist
│   │   │   ├── agents/
│   │   │   │   ├── prohibited.ts
│   │   │   │   ├── disintermediation.ts
│   │   │   │   ├── health-claims.ts
│   │   │   │   └── image-analysis.ts
│   │   │   ├── queue/
│   │   │   │   ├── interface.ts
│   │   │   │   ├── bullmq.ts
│   │   │   │   ├── sqs.ts
│   │   │   │   └── index.ts            # factory on QUEUE_PROVIDER env
│   │   │   ├── guardrails/
│   │   │   │   ├── budget.ts            # withBudget wrapper
│   │   │   │   ├── circuit-breaker.ts
│   │   │   │   └── redactor.ts          # PII regex stripping
│   │   │   └── eval/
│   │   │       ├── runner.ts
│   │   │       └── metrics.ts           # P/R/F1 calc
│   │   └── worker.ts                    # queue consumer entry (Railway: tsx src/server/worker.ts)
│   │
│   ├── scripts/                          # CLI scripts — run via tsx
│   │   ├── migrate.ts                   # reads lib/db/migrations/*.sql, tracks in _migrations
│   │   ├── seed-policies.ts             # reads policies/ → lib/utils/embedding → lib/db/queries/policies
│   │   └── seed-demo.ts                 # 10 pre-built listings via lib/db/queries/
│   │
│   └── lib/                             # SHARED — imported by both app/ and server/
│       ├── db/
│       │   ├── pool.ts                  # pg Pool singleton, query<T>, queryOne<T>, executeInTransaction
│       │   ├── migrations.ts            # ensureMigrationsTable, getAppliedMigrations, applyMigration
│       │   ├── queries/
│       │   │   ├── listings.ts          # insertListing, getListingById, updateListingStatus
│       │   │   ├── reviews.ts           # insertReview, getReviewById, getReviewsWithListings, updateReviewStatus
│       │   │   ├── policies.ts          # upsertPolicyChunks, replaceAllPolicyChunks, searchPoliciesByEmbedding
│       │   │   ├── evals.ts             # insertEvalRun, insertEvalCase, getEvalRuns
│       │   │   └── webhooks.ts          # insertWebhook, getActiveWebhooks
│       │   └── migrations/
│       │       └── *.sql                # numbered SQL migration files
│       ├── types/
│       │   ├── db.ts                    # Row types: ListingRow, ReviewRow, PolicyRow, etc.
│       │   ├── api.ts                   # Request/response shapes
│       │   └── index.ts                 # re-exports
│       ├── utils/
│       │   ├── sanitize.ts              # HTML sanitization
│       │   ├── embedding.ts             # OpenAI embed call, chunking (512 tokens, 64 overlap)
│       │   ├── webhook.ts               # fire webhook with HMAC signing
│       │   └── format.ts                # confidence %, duration formatting
│       ├── validation.ts                # Zod schemas (used client + server)
│       └── rate-limit.ts                # Redis sliding window, keyed by IP
│
├── policies/
│   ├── counterfeit_items.md
│   ├── prohibited_items.md
│   ├── quality_standards.md
│   └── restricted_categories.md
│
├── evals/
│   ├── cases/                           # 20+ JSON test cases
│   ├── results/
│   └── run.ts
│
├── tests/
│   ├── aggregator.test.ts
│   ├── rate-limit.test.ts
│   ├── circuit-breaker.test.ts
│   ├── redactor.test.ts
│   └── validation.test.ts
│
├── infra/
│   ├── docker-compose.yml               # Postgres 16 + Redis 7
│   └── aws-sam/
│       └── template.yaml                # Lambda + SQS reference
│
├── .env.local.example
├── .eslintrc.json
├── .prettierrc
├── tsconfig.json
├── Makefile
└── README.md