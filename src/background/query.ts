import { QueryClient } from '@tanstack/query-core'

// Paging through reviews repeats the same project and author lookups, so they are kept for a while.
export const backgroundQueries = new QueryClient({
	defaultOptions: {
		queries: { staleTime: 5 * 60_000, gcTime: 5 * 60_000, retry: false },
	},
})
