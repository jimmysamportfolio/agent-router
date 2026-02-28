import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "@/server/trpc";
import { reviewIdSchema } from "@/features/reviews";

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
