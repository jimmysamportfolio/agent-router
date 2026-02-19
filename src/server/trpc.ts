import { initTRPC } from "@trpc/server";
import { query, queryOne, executeInTransaction } from "@/lib/db/pool";

export function createTRPCContext() {
  return { db: { query, queryOne, executeInTransaction } };
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
