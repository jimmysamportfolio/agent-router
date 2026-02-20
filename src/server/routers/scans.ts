import { TRPCError } from "@trpc/server";
import { router, publicProcedure } from "../trpc";
import { reviewIdSchema } from "@/lib/validation";
import { getScanByReviewId } from "@/lib/db/queries/scans";

export const scansRouter = router({
  getById: publicProcedure.input(reviewIdSchema).query(async ({ input }) => {
    const scan = await getScanByReviewId(input);
    if (!scan) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: `Scan for review ${input} not found`,
      });
    }
    return scan;
  }),
});
