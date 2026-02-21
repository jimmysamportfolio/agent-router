import { Queue, Worker } from "bullmq";
import type { ConnectionOptions } from "bullmq";
import { REVIEW_QUEUE_NAME, type ReviewJobData } from "@/lib/queue";
import { ConfigError, InvariantError } from "@/lib/errors";
import type { QueueProvider, QueueWorkerHandle } from "@/server/pipeline/queue/interface";

export class BullMQProvider implements QueueProvider {
  private readonly connection: ConnectionOptions;
  private queue: Queue | undefined;

  constructor() {
    if (!process.env.REDIS_URL) throw new ConfigError("REDIS_URL");
    this.connection = { url: process.env.REDIS_URL };
  }

  private getQueue(): Queue {
    if (this.queue) return this.queue;
    this.queue = new Queue(REVIEW_QUEUE_NAME, {
      connection: this.connection,
      defaultJobOptions: {
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    });
    return this.queue;
  }

  async enqueue(data: ReviewJobData): Promise<string> {
    const job = await this.getQueue().add("process-review", data);
    if (!job.id) throw new InvariantError("BullMQ did not assign a job ID");
    return job.id;
  }

  createWorker(handler: (data: ReviewJobData) => Promise<void>): QueueWorkerHandle {
    const worker = new Worker<ReviewJobData>(
      REVIEW_QUEUE_NAME,
      async (job) => handler(job.data),
      { connection: this.connection, concurrency: 3 },
    );

    worker.on("failed", (job, err) => {
      console.error(`[BullMQ] Job ${job?.id} failed:`, err.message);
    });

    worker.on("error", (err) => {
      console.error("[BullMQ] Worker error:", err.message);
    });

    return { close: () => worker.close() };
  }
}
