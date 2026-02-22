import IORedis from "ioredis";
import { Queue, type ConnectionOptions } from "bullmq";
import { ConfigError, InvariantError } from "@/lib/errors";

export const REVIEW_QUEUE_NAME = "review-pipeline";

export interface ReviewJobData {
  reviewId: string;
  listingId: string;
}

let reviewQueue: Queue | undefined;

function getReviewQueue(): Queue {
  if (reviewQueue) return reviewQueue;

  if (!process.env.REDIS_URL) throw new ConfigError("REDIS_URL");

  const connection = new IORedis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });
  reviewQueue = new Queue(REVIEW_QUEUE_NAME, {
    connection: connection as ConnectionOptions,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });

  return reviewQueue;
}

export async function enqueueReview(data: ReviewJobData): Promise<string> {
  const job = await getReviewQueue().add("process-review", data);
  if (!job.id) throw new InvariantError("BullMQ did not assign a job ID");
  return job.id;
}
