import IORedis from "ioredis";
import { Worker, type Job, type ConnectionOptions } from "bullmq";
import { REVIEW_QUEUE_NAME, type ReviewJobData } from "@/lib/queue";
import { processReview } from "@/server/pipeline/orchestrator";
import { ConfigError } from "@/lib/errors";

if (!process.env.REDIS_URL) throw new ConfigError("REDIS_URL");

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
});

async function handleJob(job: Job<ReviewJobData>): Promise<void> {
  console.log(
    `[Worker] Processing job ${job.id} — review ${job.data.reviewId}`,
  );
  await processReview(job.data.reviewId);
  console.log(`[Worker] Completed job ${job.id} — review ${job.data.reviewId}`);
}

const worker = new Worker<ReviewJobData>(REVIEW_QUEUE_NAME, handleJob, {
  connection: connection as ConnectionOptions,
  concurrency: 3,
});

worker.on("failed", (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on("error", (err) => {
  console.error("[Worker] Worker error:", err.message);
});

console.log(`[Worker] Listening on queue "${REVIEW_QUEUE_NAME}"...`);

function shutdown(): void {
  console.log("[Worker] Shutting down...");
  worker
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
