import type { ReviewJobData } from "@/lib/queue";

export interface QueueWorkerHandle {
  close(): Promise<void>;
}

export interface QueueProvider {
  enqueue(data: ReviewJobData): Promise<string>;
  createWorker(
    handler: (data: ReviewJobData) => Promise<void>,
  ): QueueWorkerHandle;
}
