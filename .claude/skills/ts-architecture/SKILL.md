---
name: ts-architecture
description: TypeScript project architecture, folder structure, and OOP design patterns for production-quality code. Use this skill whenever the user is scaffolding a new TypeScript project, reorganizing an existing codebase, asking where files or types should go, creating feature modules, setting up dependency injection, designing interfaces or abstract classes, or applying SOLID principles in TypeScript. Also trigger when the user mentions folder structure, project organization, barrel exports, repository pattern, service layer, or feature-based architecture — even if they don't explicitly say "architecture." Covers both frontend (React/Next.js) and backend (Node/Express) TypeScript projects.
---

# TypeScript Architecture & Production Patterns

## Core Philosophy

1. **Organize by domain, not by technical role.** Group files by business
   concept (orders, users, payments), not by what they are. Changes to one
   feature touch one folder.

2. **Depend on abstractions, inject dependencies.** Classes accept interfaces
   via their constructor, not concrete implementations.

3. **Encapsulate at every level.** Classes use access modifiers. Modules use
   barrel exports. Features hide their internals.

## Reference Files

Read the relevant reference before starting work:

- `references/folder-structures.md` — Framework-specific layouts (Next.js, Express, SPA, tRPC). Read before scaffolding.
- `references/error-handling.md` — Base error class template, error structure, centralized handler.
- `references/documentation.md` — TSDoc conventions, what to document vs skip.
- `references/database.md` — Connection pool, base repository, transactions, migrations.

## The Seven Principles

1. **Cohesion / SRP** — One class, one reason to change. Services own business logic. Repositories own data access. Validators own input schemas. Components own rendering.

2. **Encapsulation** — Use `private`, `protected`, `readonly`, and barrel exports to hide internals. If the consumer doesn't need it, don't expose it.

3. **Loose Coupling** — Depend on interfaces, not implementations. Start with interfaces; only use abstract classes when subclasses need shared logic.

4. **Reusability** — Use generics for type-safe reusable structures. Use the strategy pattern when behavior varies. Prefer composition over inheritance.

5. **Portability** — Abstract platform-specific concerns (LLM clients, caches, queues, file storage) behind interfaces.

6. **Defensibility** — Value objects with validation, discriminated unions with exhaustive switches, `readonly`/`as const`, validated env config, `strict: true`.

7. **Testability** — Inject dependencies via constructor, mock at the interface level, test at boundaries. Follows naturally from principles 2–5.

## File & Type Placement

Types live as close to their consumers as possible:

| Type | Location |
|------|----------|
| Domain-specific (Order, User) | `features/<domain>/types.ts` |
| Shared contracts (ApiResponse) | `types/api.ts` |
| Shared primitives (ID, Timestamp) | `types/common.ts` |
| Infrastructure contracts (Cache) | `lib/<concern>/<n>.interface.ts` |
| DB row types | `types/db.ts` or within feature |

Code placement:

| Code | Location |
|------|----------|
| Business logic | `features/<domain>/services/` |
| Data access | Co-located in `features/<domain>/services/<service>.ts` or standalone `features/<domain>/<repo>.ts` |
| Domain UI components | `features/<domain>/components/` |
| Shared UI components | `components/ui/` |
| Domain hooks | `features/<domain>/hooks/` |
| Domain errors | `features/<domain>/errors.ts` |
| Shared errors | `lib/errors/` |
| Shared utilities | `lib/utils/` |
| Validation schemas | `lib/validation.ts` or inline in feature |

Only truly shared code (used by 2+ features) lives in `lib/`. Feature-specific code always lives in the feature folder.

## Barrel Exports & Feature Boundaries

Every feature has an `index.ts` that controls its public API. Other features
import only from this barrel — never reach into internals.

```typescript
// features/orders/index.ts — public API
export type { Order, OrderStatus } from "./types";
export { OrderService } from "./services/order.service";
export { OrderCard } from "./components/OrderCard";
```

```typescript
// ✅ features/payments/ → imports from features/orders/index.ts
// ✅ features/payments/ → imports from lib/db/client.ts
// ❌ features/payments/ → imports from features/orders/repositories/order.repository.ts
```

## Scaling

Scale conventions to project size:

- **Small (< 10 files):** Flat `src/` with types alongside code. No features folder.
- **Medium (10–30 files):** Introduce `features/`, `lib/`, and `types/`. Add barrel exports.
- **Large (50+ files):** Full feature-based architecture with repositories, services, validators, and DI.

**New feature?** Ask: "Is this a distinct domain concept with its own data
and logic?" Yes → feature. Pure utility → `lib/`. Generic UI → `components/ui/`.

**Feature too big (20+ files)?** Split into sub-features with a single barrel:

```
features/orders/
├── core/
├── fulfillment/
├── returns/
└── index.ts
```

## Checklist

- [ ] Every feature has a barrel `index.ts`
- [ ] No cross-feature internal imports
- [ ] Types co-located with their feature
- [ ] Services depend on interfaces, not concrete classes
- [ ] Pages/routes are thin — delegate to feature services
- [ ] `strict: true` in tsconfig.json
- [ ] `@/*` path alias configured (`"paths": { "@/*": ["./src/*"] }`)