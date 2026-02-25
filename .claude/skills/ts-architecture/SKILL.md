---
name: ts-architecture
description: TypeScript project architecture, folder structure, and OOP design patterns for production-quality code. Use this skill whenever the user is scaffolding a new TypeScript project, reorganizing an existing codebase, asking where files or types should go, creating feature modules, setting up dependency injection, designing interfaces or abstract classes, or applying SOLID principles in TypeScript. Also trigger when the user mentions folder structure, project organization, barrel exports, repository pattern, service layer, or feature-based architecture — even if they don't explicitly say "architecture." Covers both frontend (React/Next.js) and backend (Node/Express) TypeScript projects.
---

# TypeScript Architecture & Production Patterns

This skill provides conventions for organizing TypeScript projects and applying
OOP design patterns that produce maintainable, testable, production-quality code.

Use this when helping users scaffold new projects, refactor existing ones, or
answer questions about where things should go and how they should be structured.

## Core Philosophy

Three ideas drive every decision in this skill:

1. **Organize by domain, not by technical role.** Group files by what business
   concept they serve (orders, users, payments), not by what they are (all
   services in one folder, all types in another). This means changes to one
   feature touch one folder.

2. **Depend on abstractions, inject dependencies.** Classes accept interfaces
   via their constructor, not concrete implementations. This makes everything
   testable and swappable.

3. **Encapsulate at every level.** Classes use access modifiers. Modules use
   barrel exports. Features hide their internals. The less surface area
   exposed, the easier the codebase is to change.

## When to Apply What

Not every project needs the full structure. Scale conventions to project size:

- **Small (< 10 files):** Flat `src/` with types alongside code. No features folder needed.
- **Medium (10–30 files):** Introduce `features/`, `lib/`, and `types/`. Add barrel exports.
- **Large (50+ files):** Full feature-based architecture with repositories, services, validators, and dependency injection.

For framework-specific folder structures (Next.js, Express, etc.), see
`references/folder-structures.md`. Read it before scaffolding a project.

## The Seven Principles

Apply these principles in TypeScript using the patterns below. For detailed
code examples of each, see `references/patterns.md`.

### 1. Cohesion / Single Responsibility

One class, one reason to change. One file, one job.

- Services contain business logic and orchestrate other services/repos
- Repositories handle database access exclusively
- Validators define input schemas (Zod is the go-to)
- Components render UI; hooks manage client state and data fetching
- Utility functions are pure, stateless helpers

When a class starts doing two things, split it. When a file exceeds ~200 lines,
that's usually a sign it has multiple responsibilities.

### 2. Encapsulation & Abstraction

TypeScript has stronger encapsulation tools than most languages — use them.

- **`private`** for internal state no one else should touch
- **`protected`** for state subclasses need but outside code doesn't
- **`readonly`** for values that shouldn't change after construction
- **Barrel exports** (`index.ts`) to hide feature internals from other modules

The guiding question: "Does the consumer need to know about this?" If not,
don't expose it.

### 3. Loose Coupling & Modularity

Depend on interfaces, not implementations. This is the most impactful pattern
for testability and flexibility.

```typescript
// Define a contract
interface PaymentGateway {
  charge(amount: number): Promise<PaymentResult>;
}

// Inject it — don't instantiate it
class OrderService {
  constructor(private payment: PaymentGateway) {}
}
```

**Interface vs Abstract Class decision:**
- Start with an interface (pure contract, zero runtime cost, multiple implementation)
- Only use an abstract class when you have shared logic subclasses should inherit
- A class can implement many interfaces but extend only one class

### 4. Reusability & Extensibility

- Use **generics** for type-safe reusable structures (Result<T>, Repository<T>)
- Use the **strategy pattern** when behavior varies (pricing strategies, notification channels, auth providers)
- Prefer **composition over inheritance** — inject behavior rather than extending base classes

### 5. Portability

Abstract platform-specific concerns behind interfaces so business logic
doesn't depend on any specific runtime, database, or external service.

Common boundaries to abstract: LLM clients, cache layers, queue systems,
file storage, email/notification providers.

### 6. Defensibility

Make invalid states unrepresentable and fail fast at boundaries.

- **Value objects** with private constructors and factory methods that validate
- **Discriminated unions** with exhaustive switch statements
- **`readonly` and `as const`** to prevent accidental mutation
- **Validated environment config** (Zod schema parsed at startup)
- **`strict: true`** in tsconfig.json — always

### 7. Testability

If you followed principles 2–5, testability comes almost for free:

- Inject dependencies via constructor → mock at the interface level
- No mocking library needed — just implement the interface with a test double
- Test services in isolation by providing fake repositories
- Test at the boundary: validate inputs, assert outputs, don't test private methods

## File & Type Placement Rules

These rules answer the #1 question: "Where does this go?"

**Types live close to their consumers:**

| Type | Location | Reason |
|------|----------|--------|
| Domain-specific (Order, User) | `features/<domain>/types.ts` | Co-located with its feature |
| Shared contracts (ApiResponse, PaginatedList) | `types/api.ts` | Used across many features |
| Shared primitives (ID, Timestamp) | `types/common.ts` | Universal building blocks |
| Infrastructure contracts (Cache, Logger) | `lib/<concern>/<name>.interface.ts` | Not domain-specific |
| DB row types | `types/db.ts` or within feature | Depends on how many features use them |

**Code placement:**

| Code | Location | Reason |
|------|----------|--------|
| Business logic | `features/<domain>/services/` | Domain-specific orchestration |
| Data access | `lib/db/repositories/` or `features/<domain>/repositories/` | Depends on reuse |
| UI components (domain-specific) | `features/<domain>/components/` | Co-located with feature |
| UI components (shared/generic) | `components/ui/` | Reusable primitives |
| Hooks (domain-specific) | `features/<domain>/hooks/` | Co-located with feature |
| Utilities (domain-agnostic) | `lib/utils/` | Shared infrastructure |
| Validation schemas | `features/<domain>/validators/` | Domain boundary |

## Barrel Export Convention

Every feature module must have an `index.ts` that controls its public API.
Other features import ONLY from this barrel — never reach into internals.

```typescript
// features/orders/index.ts
export type { Order, OrderStatus, CreateOrderInput } from "./types";
export { OrderService } from "./services/order.service";
export { OrderCard } from "./components/OrderCard";
export { useOrders } from "./hooks/useOrders";
// Don't export repositories, internal utils, or validators
// unless other features genuinely need them
```

```typescript
// ✅ import from barrel
import { OrderService, type Order } from "@/features/orders";

// ❌ reaching into internals
import { OrderService } from "@/features/orders/services/order.service";
```

## Feature Independence Rules

Features communicate through their public APIs (barrel exports) or shared types:

- ✅ `features/orders/` → imports from `features/users/index.ts`
- ✅ `features/orders/` → imports from `lib/db/client.ts`
- ✅ `features/orders/` → imports from `types/common.ts`
- ❌ `features/orders/` → imports from `features/users/repositories/user.repository.ts`

## Scaling Guidelines

**When to create a new feature module:** Ask "Is this a distinct domain concept
with its own data, logic, and potentially its own UI?" If yes → new feature.
If it's a pure utility → `lib/`. If it's a generic UI element → `components/ui/`.

**When a feature outgrows itself (20+ files):** Split into sub-features:
```
features/orders/
├── core/          # CRUD, types, repository
├── fulfillment/   # shipping, tracking
├── returns/       # return requests, refunds
└── index.ts       # still one public API
```

**Cross-feature shared logic:** If it has business rules → new feature or shared
feature. If it's purely technical → `lib/`.

## Path Aliases

Always configure `@/` in tsconfig.json:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": { "@/*": ["./src/*"] }
  }
}
```

## Quick Checklist

Before finalizing any structure, verify:

- [ ] Every feature has a barrel `index.ts`
- [ ] No cross-feature internal imports
- [ ] Types are co-located with their feature (not in a global dumping ground)
- [ ] Services depend on interfaces, not concrete classes
- [ ] Pages/routes are thin — they delegate to feature services
- [ ] `strict: true` is set in tsconfig.json
- [ ] Path aliases are configured
