import { router } from "./trpc";
import { healthRouter } from "./routers/_health";
import { decisionsRouter, scansRouter } from "@/features/reviews/router";

export const appRouter = router({
  health: healthRouter,
  decisions: decisionsRouter,
  scans: scansRouter,
});

export type AppRouter = typeof appRouter;
