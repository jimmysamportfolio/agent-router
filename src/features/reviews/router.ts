import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "@/server/trpc";
import {
  submitListingSchema,
  reviewIdSchema,
} from "@/features/reviews/validators";

export const decisionsRouter = router({
  submit: publicProcedure
    .input(submitListingSchema)
    .mutation(({ input, ctx }) =>
      ctx.container.submissionService.submit(input),
    ),

  getStatus: publicProcedure
    .input(reviewIdSchema)
    .query(({ input, ctx }) =>
      ctx.container.submissionService.getStatus(input),
    ),
});

export const scansRouter = router({
  getById: publicProcedure
    .input(reviewIdSchema)
    .query(async ({ input, ctx }) => {
      const scan = await ctx.container.scanRepo.getByReviewId(input);
      if (!scan) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: `Scan for review ${input} not found`,
        });
      }
      return scan;
    }),
});
