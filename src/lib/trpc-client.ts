import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/server/root";

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
    }),
  ],
});
