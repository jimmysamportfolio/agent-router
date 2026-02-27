import { REVIEW_QUEUE_NAME, type ReviewJobData } from "@/lib/queue";
import { createContainer } from "@/server/container";
import { createQueueProvider } from "@/server/queue";

const provider = createQueueProvider();
const container = createContainer((data) => provider.enqueue(data));

async function handleJob(data: ReviewJobData): Promise<void> {
  console.log(`[Worker] Processing review ${data.reviewId}`);
  await container.pipeline.processReview(data.reviewId, data.tenantId);
  console.log(`[Worker] Completed review ${data.reviewId}`);
}

const workerHandle = provider.createWorker(handleJob);

console.log(`[Worker] Listening on queue "${REVIEW_QUEUE_NAME}"...`);

function shutdown(): void {
  console.log("[Worker] Shutting down...");
  workerHandle
    .close()
    .then(() => {
      console.log("[Worker] Closed.");
      process.exit(0);
    })
    .catch((err: unknown) => {
      console.error("[Worker] Error during shutdown:", err);
      process.exit(1);
    });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
