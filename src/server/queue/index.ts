import type { QueueProvider } from "@/server/queue/queue.interface";
import { BullMQProvider } from "@/server/queue/bullmq";
import { ConfigError } from "@/lib/errors";

export type {
  QueueProvider,
  QueueWorkerHandle,
} from "@/server/queue/queue.interface";

export function createQueueProvider(): QueueProvider {
  const provider = process.env.QUEUE_PROVIDER ?? "bullmq";

  switch (provider) {
    case "bullmq":
      return new BullMQProvider();
    default:
      throw new ConfigError(`Unknown queue provider: ${provider}`);
  }
}
