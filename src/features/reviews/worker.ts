import { executeInTransaction } from "@/lib/db/client";
import { createContainer } from "@/server/container";
import { REVIEW_QUEUE_NAME, createQueueProvider } from "@/lib/queue";
import type { ReviewJobData } from "@/features/reviews/types";

const provider = createQueueProvider<ReviewJobData>();
const container = createContainer((data) => provider.enqueue(data));

async function handleJob(data: ReviewJobData): Promise<void> {
  const { reviewId, tenantId } = data;
  console.log(`[Worker] Processing review ${reviewId}`);

  await container.reviewRepo.updateStatus(reviewId, "routing");

  try {
    const review = await container.reviewRepo.getById(reviewId);
    if (!review) throw new Error(`Review not found: ${reviewId}`);

    const listing = await container.listingRepo.getById(review.listing_id);
    if (!listing) throw new Error(`Listing not found: ${review.listing_id}`);

    const result = await container.pipeline.process(listing, tenantId);

    await executeInTransaction(async (client) => {
      await container.reviewRepo.updateVerdict(
        reviewId,
        result.verdict,
        result.confidence,
        result.explanation,
        { traces: result.traces },
        client,
      );
      if (result.violations.length > 0) {
        await container.violationRepo.insertMany(
          reviewId,
          result.violations,
          client,
        );
      }
    });

    console.log(`[Worker] Completed review ${reviewId}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    try {
      await container.reviewRepo.updateStatus(reviewId, "failed", {
        error: msg,
      });
    } catch {
      console.error(`Failed to update review ${reviewId} to failed status`);
    }
    throw err;
  }
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
