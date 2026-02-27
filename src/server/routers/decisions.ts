import { router, publicProcedure } from "@/server/trpc";
import {
  submitListingSchema,
  reviewIdSchema,
} from "@/features/reviews/validators/review.validators";

export const decisionsRouter = router({
  submit: publicProcedure
    .input(submitListingSchema)
    .mutation(({ input, ctx }) => ctx.container.reviewService.submit(input)),

  getStatus: publicProcedure
    .input(reviewIdSchema)
    .query(({ input, ctx }) => ctx.container.reviewService.getStatus(input)),
});
