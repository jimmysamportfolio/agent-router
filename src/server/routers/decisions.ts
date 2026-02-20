import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "@/server/trpc";
import { submitListingSchema, reviewIdSchema } from "@/lib/validation";
import { executeInTransaction } from "@/lib/db/pool";
import { insertListing } from "@/lib/db/queries/listings";
import { insertReview, getReviewById } from "@/lib/db/queries/reviews";

export const decisionsRouter = router({
  submit: publicProcedure
    .input(submitListingSchema)
    .mutation(async ({ input, ctx }) => {
      const { listing, review } = await executeInTransaction(async (client) => {
        const newListing = await insertListing(
          {
            title: input.title,
            description: input.description,
            category: input.category,
            imageUrls: input.imageUrls ?? [],
            metadata: input.metadata ?? {},
          },
          client,
        );
        const newReview = await insertReview(newListing.id, client);
        return { listing: newListing, review: newReview };
      });

      await ctx.enqueueReview({
        reviewId: review.id,
        listingId: listing.id,
      });

      return { reviewId: review.id };
    }),

  getStatus: publicProcedure.input(reviewIdSchema).query(async ({ input, ctx }) => {
    const review = await getReviewById(input);
    if (!review) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Review ${input} not found`,
      });
    }

    const STALE_THRESHOLD_MS = 2 * 60 * 1000;
    const isStuck =
      review.status === "pending" &&
      Date.now() - review.created_at.getTime() > STALE_THRESHOLD_MS;

    if (isStuck) {
      await ctx.enqueueReview({ reviewId: review.id, listingId: review.listing_id });
    }

    return {
      reviewId: review.id,
      status: review.status,
      verdict: review.verdict,
      confidence: review.confidence,
      createdAt: review.created_at,
      updatedAt: review.updated_at,
    };
  }),
});
