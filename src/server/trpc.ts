import { initTRPC } from "@trpc/server";
import { enqueueReview } from "@/lib/queue";

export function createTRPCContext() {
  return {
    enqueueReview,
  };
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
