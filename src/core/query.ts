import { QueryCache, QueryClient, VueQueryPlugin } from '@tanstack/vue-query'
import type { App } from 'vue'
import { browser } from 'wxt/browser'

// Every injected app shares one client, so a page fetched by one is cached for all of them.
const queryClient = new QueryClient({
	queryCache: new QueryCache({
		onError: (error, query) =>
			console.error(`[Modrinth Extras] Failed to load ${String(query.queryKey[0])}:`, error),
	}),
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

type BackgroundResponse<T> = ({ ok: true } & T) | { ok: false; error?: string }

// Background handlers answer with { ok: false } instead of throwing, so this turns that into a query error.
export async function queryBackground<T>(message: { type: string; [key: string]: unknown }) {
	const response = (await browser.runtime.sendMessage(message)) as BackgroundResponse<T> | undefined
	if (!response) throw new Error('No response from the background')
	if (!response.ok) throw new Error(response.error ?? `${message.type} failed`)
	return response
}
