import { router } from "./trpc";
import { healthRouter } from "./routers/_health";
import { decisionsRouter } from "./routers/decisions";
import { scansRouter } from "./routers/scans";

export const appRouter = router({
  health: healthRouter,
  decisions: decisionsRouter,
  scans: scansRouter,
});

export type AppRouter = typeof appRouter;
