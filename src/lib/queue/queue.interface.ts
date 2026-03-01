export const REVIEW_QUEUE_NAME = "review-pipeline";

export interface QueueWorkerHandle {
  close(): Promise<void>;
}

export interface QueueProvider<T> {
  enqueue(data: T): Promise<string>;
  createWorker(handler: (data: T) => Promise<void>): QueueWorkerHandle;
  close(): Promise<void>;
}
