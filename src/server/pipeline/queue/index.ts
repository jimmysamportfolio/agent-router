import type { QueueProvider } from "@/server/pipeline/queue/interface";
import { BullMQProvider } from "@/server/pipeline/queue/bullmq";

export type {
  QueueProvider,
  QueueWorkerHandle,
} from "@/server/pipeline/queue/interface";

export function createQueueProvider(): QueueProvider {
  const provider = process.env.QUEUE_PROVIDER ?? "bullmq";

  switch (provider) {
    case "bullmq":
      return new BullMQProvider();
    default:
      throw new Error(`Unknown queue provider: ${provider}`);
  }
}
