import { router, publicProcedure } from "../trpc";

export const healthRouter = router({
  ping: publicProcedure.query(() => ({ status: "ok" as const })),
});
