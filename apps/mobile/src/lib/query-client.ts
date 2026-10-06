import { QueryCache, QueryClient } from "@tanstack/react-query";
import { isApiError } from "@techrat/api";

/**
 * React Query client. A 401 means the access token was rejected: try one refresh,
 * and sign out when that fails so the auth guard routes back to login.
 */
export function createQueryClient(onUnauthorized: () => Promise<void>) {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (error) => {
        if (isApiError(error, 401)) void onUnauthorized();
      },
    }),
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (count, error) => !isApiError(error) && count < 2,
      },
    },
  });
}
