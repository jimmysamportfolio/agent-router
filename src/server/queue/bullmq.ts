import IORedis from "ioredis";
import { Queue, Worker, type ConnectionOptions } from "bullmq";
import { InvariantError } from "@/lib/errors";
import { getRedisEnv } from "@/config/env";
import {
  REVIEW_QUEUE_NAME,
  type ReviewJobData,
  type QueueProvider,
  type QueueWorkerHandle,
} from "@/server/queue/queue.interface";

const WORKER_CONCURRENCY = 3;
const REMOVE_ON_COMPLETE = 100;
const REMOVE_ON_FAIL = 500;

export class BullMQProvider implements QueueProvider {
  private queueConnection: IORedis | undefined;
  private queue: Queue | undefined;

  private getQueueConnection(): IORedis {
    if (this.queueConnection) return this.queueConnection;
    const { REDIS_URL } = getRedisEnv();
    this.queueConnection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
    });
    return this.queueConnection;
  }

  private getQueue(): Queue {
    if (this.queue) return this.queue;
    this.queue = new Queue(REVIEW_QUEUE_NAME, {
      connection: this.getQueueConnection() as ConnectionOptions,
      defaultJobOptions: {
        removeOnComplete: REMOVE_ON_COMPLETE,
        removeOnFail: REMOVE_ON_FAIL,
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
    const { REDIS_URL } = getRedisEnv();

    const workerConnection = new IORedis(REDIS_URL, {
      maxRetriesPerRequest: null,
    });

    const worker = new Worker<ReviewJobData>(
      REVIEW_QUEUE_NAME,
      async (job) => handler(job.data),
      {
        connection: workerConnection as ConnectionOptions,
        concurrency: WORKER_CONCURRENCY,
      },
    );

    worker.on("failed", (job, err) => {
      console.error(`[BullMQ] Job ${job?.id} failed:`, err.message);
    });

    worker.on("error", (err) => {
      console.error("[BullMQ] Worker error:", err.message);
    });

    return {
      close: async () => {
        await worker.close();
        await workerConnection.quit();
      },
    };
  }

  async close(): Promise<void> {
    if (this.queue) {
      await this.queue.close();
    }
    if (this.queueConnection) {
      await this.queueConnection.quit();
    }
  }
}
