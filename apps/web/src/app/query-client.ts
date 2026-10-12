import { QueryClient } from '@tanstack/react-query'

const MAX_RETRY_DELAY_MS = 10_000

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 3,
        retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS),
        refetchOnWindowFocus: true,
      },
    },
  })
}
