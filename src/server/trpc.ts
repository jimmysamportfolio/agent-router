import { initTRPC } from "@trpc/server";
import { query, queryOne, executeInTransaction } from "@/lib/db/pool";
import { getRedis } from "@/lib/redis";
import { enqueueReview } from "@/lib/queue";

export function createTRPCContext() {
  return {
    db: { query, queryOne, executeInTransaction },
    redis: getRedis,
    enqueueReview,
  };
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
