export const REVIEW_QUEUE_NAME = "review-pipeline";

export interface ReviewJobData {
  reviewId: string;
  listingId: string;
  tenantId: string;
}

export interface QueueWorkerHandle {
  close(): Promise<void>;
}

export interface QueueProvider {
  enqueue(data: ReviewJobData): Promise<string>;
  createWorker(
    handler: (data: ReviewJobData) => Promise<void>,
  ): QueueWorkerHandle;
  close(): Promise<void>;
}
