import { Queue, type ConnectionOptions } from "bullmq";

export const REVIEW_QUEUE_NAME = "review-pipeline";

export interface ReviewJobData {
  reviewId: string;
  listingId: string;
}

let reviewQueue: Queue | undefined;

function getReviewQueue(): Queue {
  if (reviewQueue) return reviewQueue;

  if (!process.env.REDIS_URL) throw new Error("REDIS_URL is required");
  
  const connection: ConnectionOptions = { url: process.env.REDIS_URL };
  reviewQueue = new Queue(REVIEW_QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  });

  return reviewQueue;
}

export async function enqueueReview(data: ReviewJobData): Promise<string> {
  const job = await getReviewQueue().add("process-review", data, {
    jobId: data.reviewId,
  });
  return job.id ?? data.reviewId;
}
