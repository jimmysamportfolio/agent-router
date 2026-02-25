# Folder Structures by Framework

Reference file for framework-specific project organization. Each structure
follows the same core principles (feature-based, barrel exports, thin routing
layer) but adapts to framework conventions.

---

## Next.js (App Router)

```
src/
├── app/                              # ROUTING LAYER ONLY — thin pages
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Home
│   ├── (auth)/                       # Route group (no URL segment)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── dashboard/
│   │   ├── layout.tsx               # Nested layout
│   │   └── page.tsx
│   ├── orders/
│   │   ├── page.tsx                 # List
│   │   └── [id]/page.tsx            # Detail
│   └── api/                          # API routes — delegates to services
│       └── orders/route.ts
│
├── features/                         # Domain modules
│   ├── orders/
│   │   ├── types.ts
│   │   ├── services/
│   │   │   └── order.service.ts
│   │   ├── repositories/
│   │   │   └── order.repository.ts
│   │   ├── components/
│   │   │   ├── OrderCard.tsx
│   │   │   └── OrderList.tsx
│   │   ├── hooks/
│   │   │   └── useOrders.ts
│   │   ├── validators/
│   │   │   └── order.validators.ts
│   │   └── index.ts                 # Barrel export
│   └── users/
│       └── ...same structure
│
├── components/                       # Shared UI only
│   ├── ui/                          # Generic primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Modal.tsx
│   ├── layout/
│   │   ├── Header.tsx
│   │   └── Sidebar.tsx
│   └── providers/
│       └── AuthProvider.tsx
│
├── lib/                              # Shared infrastructure
│   ├── db/
│   │   ├── client.ts
│   │   └── base.repository.ts
│   ├── api/
│   │   ├── api-client.ts
│   │   └── api-error.ts
│   └── utils/
│       └── result.ts
│
├── types/                            # Global shared types
│   ├── index.ts
│   ├── common.ts
│   ├── api.ts
│   ├── db.ts
│   └── env.d.ts
│
└── config/
    ├── env.ts                       # Validated env vars
    └── constants.ts
```

### Next.js-Specific Rules

- **Pages are server components by default.** Keep them thin — fetch data and
  compose feature components. Business logic stays in feature services.
- **API routes delegate immediately.** `route.ts` validates the request and
  calls a feature service. No business logic in route handlers.
- **Server vs client components:** Server components can import from
  `features/<domain>/services/` and `lib/`. Client components use hooks from
  `features/<domain>/hooks/`. Don't import server-only code into client components.
- **Route groups** `(auth)` organize routes without affecting URLs.

### Thin Page Example

```typescript
// app/orders/page.tsx
import { OrderList } from "@/features/orders";
import { requireAuth } from "@/lib/auth/session";

export default async function OrdersPage() {
  const session = await requireAuth();
  return (
    <main>
      <h1>Your Orders</h1>
      <OrderList userId={session.userId} />
    </main>
  );
}
```

### Thin API Route Example

```typescript
// app/api/orders/route.ts
import { OrderService } from "@/features/orders";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json();
  const service = new OrderService(/* inject deps */);
  try {
    const order = await service.create(body);
    return NextResponse.json(order, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Failed" }, { status: 400 });
  }
}
```

---

## Express / Fastify (Backend API)

```
src/
├── features/
│   ├── orders/
│   │   ├── types.ts
│   │   ├── services/
│   │   │   └── order.service.ts
│   │   ├── repositories/
│   │   │   └── order.repository.ts
│   │   ├── controllers/             # Express-specific: request → service → response
│   │   │   └── order.controller.ts
│   │   ├── routes/                  # Route definitions
│   │   │   └── order.routes.ts
│   │   ├── validators/
│   │   │   └── order.validators.ts
│   │   ├── middleware/              # Feature-specific middleware
│   │   │   └── order-auth.middleware.ts
│   │   └── index.ts
│   └── users/
│       └── ...same structure
│
├── lib/
│   ├── db/
│   │   ├── client.ts
│   │   └── base.repository.ts
│   ├── middleware/                   # Shared middleware
│   │   ├── error-handler.ts
│   │   ├── rate-limiter.ts
│   │   └── auth.ts
│   └── utils/
│       └── result.ts
│
├── types/
│   ├── common.ts
│   ├── api.ts
│   └── env.d.ts
│
├── config/
│   ├── env.ts
│   └── constants.ts
│
└── server.ts                        # App entry point, mounts feature routes
```

### Express-Specific Rules

- **Controllers are thin** — parse request, call service, format response.
  Same principle as thin pages/routes in Next.js.
- **Routes just wire URLs to controllers.** No logic in route files.
- **Middleware** can be feature-specific or shared. Feature-specific middleware
  (like order authorization checks) lives in the feature. Shared middleware
  (like rate limiting) lives in `lib/middleware/`.

### Controller Example

```typescript
// features/orders/controllers/order.controller.ts
import { OrderService } from "../services/order.service";
import type { Request, Response, NextFunction } from "express";

export class OrderController {
  constructor(private orderService: OrderService) {}

  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const order = await this.orderService.create(req.body);
      res.status(201).json(order);
    } catch (error) {
      next(error);
    }
  };
}
```

### Route Wiring Example

```typescript
// features/orders/routes/order.routes.ts
import { Router } from "express";
import { OrderController } from "../controllers/order.controller";
import { validate } from "@/lib/middleware/validate";
import { createOrderSchema } from "../validators/order.validators";

export function createOrderRoutes(controller: OrderController): Router {
  const router = Router();
  router.post("/", validate(createOrderSchema), controller.create);
  router.get("/:id", controller.getById);
  return router;
}

// server.ts — mount all feature routes
app.use("/api/orders", createOrderRoutes(orderController));
app.use("/api/users", createUserRoutes(userController));
```

---

## React SPA (Vite / CRA — no backend)

```
src/
├── features/
│   ├── orders/
│   │   ├── types.ts
│   │   ├── api/                     # API client calls (replaces services/repos)
│   │   │   └── order.api.ts
│   │   ├── components/
│   │   │   ├── OrderCard.tsx
│   │   │   └── OrderList.tsx
│   │   ├── hooks/
│   │   │   └── useOrders.ts
│   │   ├── store/                   # Feature-level state (Zustand slice, Redux slice)
│   │   │   └── order.store.ts
│   │   └── index.ts
│   └── users/
│       └── ...same structure
│
├── components/                      # Shared UI
│   ├── ui/
│   └── layout/
│
├── lib/
│   ├── api-client.ts               # Configured fetch/axios instance
│   └── utils/
│
├── types/
│   ├── common.ts
│   └── api.ts
│
├── config/
│   └── constants.ts
│
├── router/                          # Route definitions (React Router)
│   └── index.tsx
│
└── App.tsx
```

### SPA-Specific Rules

- **No services/repositories** — the backend owns business logic. Features
  have an `api/` folder with typed API client functions instead.
- **State management** (if needed) is feature-scoped. Each feature owns its
  own Zustand store or Redux slice.
- **Router is separate** from features — it composes feature components into
  pages, similar to how Next.js `app/` composes features.

---

## tRPC (Full-Stack with Shared Types)

When using tRPC (often with Next.js or a standalone server), the feature
structure extends to include routers:

```
src/
├── features/
│   ├── orders/
│   │   ├── types.ts
│   │   ├── services/
│   │   │   └── order.service.ts
│   │   ├── repositories/
│   │   │   └── order.repository.ts
│   │   ├── router/                  # tRPC router for this feature
│   │   │   └── order.router.ts
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── validators/
│   │   │   └── order.validators.ts  # Zod schemas (shared: tRPC input + client)
│   │   └── index.ts
│   └── ...
│
├── server/
│   ├── trpc.ts                      # initTRPC, context creation
│   └── root.ts                      # mergeRouters from all features
```

### tRPC-Specific Rules

- **Feature routers are thin** — validate input (Zod), call service, return.
- **Zod schemas in validators/** are shared between tRPC input validation
  and client-side form validation. This is a major DX win.
- **The root router** in `server/root.ts` just merges feature routers.
  No logic there.

---

## Universal Rules (All Frameworks)

Regardless of framework, these always apply:

1. **Barrel exports on every feature.** `index.ts` controls the public API.
2. **Types co-located with features.** Only truly shared types go in `types/`.
3. **Thin routing/page layer.** Routes, pages, and controllers just wire
   things together — no business logic.
4. **`@/` path alias configured.** No `../../../` imports.
5. **`strict: true`** in tsconfig.json.
6. **Validated environment config** in `config/env.ts`.
7. **Interfaces for external dependencies** (DB, cache, APIs, LLMs).
