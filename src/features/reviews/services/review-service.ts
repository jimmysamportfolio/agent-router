import { TRPCError } from "@trpc/server";
import { executeInTransaction } from "@/lib/db/client";
import type { ReviewJobData } from "@/features/reviews/types";
import type {
  ReviewRow,
  IReviewRepository,
} from "@/features/reviews/repositories/review-repository";
import type {
  ReviewStatusOutput,
  SubmitListingInput,
} from "@/features/reviews/types";
import type { IListingRepository } from "@/features/listings";

export type EnqueueReviewFn = (data: ReviewJobData) => Promise<string>;

export class ReviewService {
  private static readonly STALE_THRESHOLD_MS = 2 * 60 * 1000;

  constructor(
    private readonly reviewRepo: IReviewRepository,
    private readonly listingRepo: IListingRepository,
    private readonly enqueueReview: EnqueueReviewFn,
  ) {}

  async submit(input: SubmitListingInput): Promise<{ reviewId: string }> {
    const { listing, review } = await executeInTransaction(async (client) => {
      const newListing = await this.listingRepo.insert(
        {
          ...input,
          imageUrls: input.imageUrls ?? [],
          metadata: input.metadata ?? {},
        },
        client,
      );
      const newReview = await this.reviewRepo.insert(newListing.id, client);
      return { listing: newListing, review: newReview };
    });

    await this.enqueueReview({
      reviewId: review.id,
      listingId: listing.id,
      tenantId: input.tenantId,
    });

    return { reviewId: review.id };
  }

  async getStatus(reviewId: string): Promise<ReviewStatusOutput> {
    const review = await this.reviewRepo.getById(reviewId);
    if (!review) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Review ${reviewId} not found`,
      });
    }

    await this.handleStuckReview(review);

    return {
      reviewId: review.id,
      status: review.status,
      verdict: review.verdict,
      confidence: review.confidence,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
    };
  }

  private async handleStuckReview(review: ReviewRow): Promise<void> {
    const isStuck =
      review.status === "pending" &&
      Date.now() - review.created_at.getTime() >
        ReviewService.STALE_THRESHOLD_MS;

    if (!isStuck) return;

    await this.reviewRepo.updateStatus(review.id, "routing");
    const listing = await this.listingRepo.getById(review.listing_id);
    if (!listing) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: `Listing ${review.listing_id} not found for stuck review`,
      });
    }
    await this.enqueueReview({
      reviewId: review.id,
      listingId: review.listing_id,
      tenantId: listing.tenant_id,
    });
  }
}
