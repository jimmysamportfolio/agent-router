import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "@/server/root";

function getUrl() {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/api/trpc`;
}

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: getUrl(),
    }),
  ],
});
