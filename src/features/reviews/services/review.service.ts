import { TRPCError } from "@trpc/server";
import { executeInTransaction } from "@/lib/db/client";
import type { IReviewRepository } from "@/lib/db/repositories/review.repository";
import type { IListingRepository } from "@/lib/db/repositories/listing.repository";
import type { ReviewJobData } from "@/lib/queue";
import type { ReviewStatusOutput } from "@/types";

interface SubmitListingInput {
  title: string;
  description: string;
  category: string;
  imageUrls?: string[] | undefined;
  metadata?: Record<string, unknown> | undefined;
  tenantId?: string | undefined;
}

const DEFAULT_TENANT_ID = "00000000-0000-0000-0000-000000000001";
const STALE_THRESHOLD_MS = 2 * 60 * 1000;

export type EnqueueReviewFn = (data: ReviewJobData) => Promise<string>;

export class ReviewService {
  constructor(
    private readonly reviewRepo: IReviewRepository,
    private readonly listingRepo: IListingRepository,
    private readonly enqueueReview: EnqueueReviewFn,
  ) {}

  async submit(input: SubmitListingInput): Promise<{ reviewId: string }> {
    const tenantId = input.tenantId ?? DEFAULT_TENANT_ID;

    const { listing, review } = await executeInTransaction(async (client) => {
      const newListing = await this.listingRepo.insert(
        {
          tenantId,
          title: input.title,
          description: input.description,
          category: input.category,
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
      tenantId,
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

    const isStuck =
      review.status === "pending" &&
      Date.now() - review.created_at.getTime() > STALE_THRESHOLD_MS;

    if (isStuck) {
      await this.reviewRepo.updateStatus(review.id, "routing");
      const listing = await this.listingRepo.getById(review.listing_id);
      await this.enqueueReview({
        reviewId: review.id,
        listingId: review.listing_id,
        tenantId: listing?.tenant_id ?? DEFAULT_TENANT_ID,
      });
    }

    const result: ReviewStatusOutput = {
      reviewId: review.id,
      status: review.status,
      verdict: review.verdict,
      confidence: review.confidence,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
    };
    return result;
  }
}
