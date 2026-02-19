import { router } from "./trpc";
import { healthRouter } from "./routers/_health";
import { decisionsRouter } from "./routers/decisions";

export const appRouter = router({
  health: healthRouter,
  decisions: decisionsRouter,
});

export type AppRouter = typeof appRouter;
