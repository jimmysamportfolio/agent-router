import IORedis from "ioredis";
import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { REVIEW_QUEUE_NAME, type ReviewJobData } from "@/lib/queue";
import { ConfigError, InvariantError } from "@/lib/errors";
import type {
  QueueProvider,
  QueueWorkerHandle,
} from "@/server/pipeline/queue/interface";

export class BullMQProvider implements QueueProvider {
  private readonly connection: IORedis;

  private queue: Queue | undefined;

  constructor() {
    if (!process.env.REDIS_URL) throw new ConfigError("REDIS_URL");
    this.connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: null,
    });
  }

  private getQueue(): Queue {
    if (this.queue) return this.queue;
    this.queue = new Queue(REVIEW_QUEUE_NAME, {
      connection: this.connection as ConnectionOptions,
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

  createWorker(
    handler: (data: ReviewJobData) => Promise<void>,
  ): QueueWorkerHandle {
    const worker = new Worker<ReviewJobData>(
      REVIEW_QUEUE_NAME,
      async (job) => handler(job.data),
      { connection: this.connection as ConnectionOptions, concurrency: 3 },
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
