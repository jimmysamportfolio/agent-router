import { initTRPC } from "@trpc/server";
import { type Container } from "@/server/container";

let container: Container | undefined;

async function getContainer(): Promise<Container> {
  if (container) return container;
  const { createContainer } = await import("@/server/container");
  const { createQueueProvider } = await import("@/lib/queue");
  const provider = createQueueProvider();
  container = createContainer((data) => provider.enqueue(data));
  return container;
}

export function resetContainer(): void {
  container = undefined;
}

export async function createTRPCContext() {
  const resolved: Container = await getContainer();
  return {
    container: resolved,
  };
}

type Context = Awaited<ReturnType<typeof createTRPCContext>>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
