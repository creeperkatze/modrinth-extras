import { QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import type { App } from 'vue'

// Every injected app shares one client, so a page fetched by one is cached for all of them.
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60_000,
			// External APIs are rate limited and sometimes slow, so failures are shown instead of retried.
			retry: false,
			refetchOnWindowFocus: false,
		},
	},
})

export function installQuery(app: App) {
	app.use(VueQueryPlugin, { queryClient })
}
