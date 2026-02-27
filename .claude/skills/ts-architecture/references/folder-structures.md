# Folder Structures by Framework

Each structure follows the same core principles (feature-based, barrel
exports, thin routing layer) adapted to framework conventions.

---

## Next.js (App Router)

```
src/
├── app/                              # Routing only — thin pages
│   ├── layout.tsx
│   ├── page.tsx
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── orders/
│   │   ├── page.tsx
│   │   └── [id]/page.tsx
│   └── api/
│       └── orders/route.ts           # Delegates to feature services
│
├── features/                         # Domain modules
│   └── <domain>/
│       ├── types.ts
│       ├── services/
│       ├── repositories/
│       ├── components/
│       ├── hooks/
│       ├── validators/
│       └── index.ts                  # Barrel export
│
├── components/                       # Shared UI only
│   ├── ui/
│   ├── layout/
│   └── providers/
│
├── lib/                              # Shared infrastructure
│   ├── db/
│   ├── errors/
│   ├── api/
│   └── utils/
│
├── types/                            # Global shared types
│   ├── common.ts
│   ├── api.ts
│   ├── db.ts
│   └── env.d.ts
│
└── config/
    ├── env.ts
    └── constants.ts
```

- Pages are server components by default — compose feature components, no business logic
- API routes delegate immediately to feature services
- Server components import from `services/`. Client components use `hooks/`.
- Route groups `(auth)` organize routes without affecting URLs

---

## Express / Fastify

```
src/
├── features/
│   └── <domain>/
│       ├── types.ts
│       ├── services/
│       ├── repositories/
│       ├── controllers/              # Request → service → response
│       ├── routes/                   # Wire URLs to controllers
│       ├── validators/
│       ├── middleware/               # Feature-specific middleware
│       └── index.ts
│
├── lib/
│   ├── db/
│   ├── errors/
│   ├── middleware/                   # Shared (error handler, rate limiter, auth)
│   └── utils/
│
├── types/
├── config/
└── server.ts                        # Mounts feature routes
```

- Controllers are thin — parse request, call service, format response
- Feature-specific middleware (like order auth) lives in the feature
- Shared middleware lives in `lib/middleware/`

---

## React SPA (Vite / CRA)

```
src/
├── features/
│   └── <domain>/
│       ├── types.ts
│       ├── api/                     # API client calls (no services/repos)
│       ├── components/
│       ├── hooks/
│       ├── store/                   # Feature-level state (Zustand/Redux slice)
│       └── index.ts
│
├── components/
│   ├── ui/
│   └── layout/
│
├── lib/
│   ├── api-client.ts               # Configured fetch/axios
│   └── utils/
│
├── types/
├── config/
├── router/
│   └── index.tsx
└── App.tsx
```

- No services/repositories — backend owns business logic
- Features have `api/` with typed client functions instead
- State management is feature-scoped

---

## tRPC

Extends any structure above with feature-level routers:

```
features/<domain>/
├── router/
│   └── <domain>.router.ts          # Thin — validate input, call service
├── validators/
│   └── <domain>.validators.ts      # Zod schemas shared by tRPC + client
└── ...

server/
├── trpc.ts                          # initTRPC, context
└── root.ts                          # mergeRouters from all features
```

---

## Universal Rules

1. Barrel exports on every feature
2. Types co-located with features
3. Thin routing/page/controller layer — no business logic
4. `@/` path alias configured
5. `strict: true` in tsconfig.json
6. Validated env config in `config/env.ts`
7. Interfaces for external dependencies