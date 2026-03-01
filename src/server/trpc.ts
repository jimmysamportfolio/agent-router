import { initTRPC } from "@trpc/server";
import { createContainer, type Container } from "@/server/container";
import { createQueueProvider } from "@/lib/queue";

let container: Container | undefined;
let containerFactory: typeof createContainer = createContainer;

function getContainer(): Container {
  if (container) return container;
  const provider = createQueueProvider();
  container = containerFactory((data) => provider.enqueue(data));
  return container;
}

export function resetContainer(factory?: typeof createContainer): void {
  container = undefined;
  if (factory) containerFactory = factory;
}

export function createTRPCContext() {
  return {
    container: getContainer(),
  };
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
