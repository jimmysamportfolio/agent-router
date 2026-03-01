import type { QueueProvider } from "@/lib/queue/queue.interface";
import { BullMQProvider } from "@/lib/queue/bullmq";
import { ConfigError } from "@/lib/errors";

export { REVIEW_QUEUE_NAME } from "@/lib/queue/queue.interface";
export type {
  QueueProvider,
  QueueWorkerHandle,
} from "@/lib/queue/queue.interface";

export function createQueueProvider<T>(): QueueProvider<T> {
  const provider = process.env.QUEUE_PROVIDER ?? "bullmq";

  switch (provider) {
    case "bullmq":
      return new BullMQProvider<T>();
    default:
      throw new ConfigError(`Unknown queue provider: ${provider}`);
  }
}
