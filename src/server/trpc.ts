import { initTRPC } from "@trpc/server";
import { enqueueReview } from "@/lib/queue";
import { createContainer, type Container } from "@/server/container";

let container: Container | undefined;
let containerFactory: typeof createContainer = createContainer;

function getContainer(): Container {
  if (container) return container;
  container = containerFactory(enqueueReview);
  return container;
}

export function resetContainer(factory?: typeof createContainer): void {
  container = undefined;
  if (factory) containerFactory = factory;
}

export function createTRPCContext() {
  return {
    container: getContainer(),
    // Keep legacy enqueueReview for backward compatibility during migration
    enqueueReview,
  };
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
