import { type AuthConfig, AuthFeature, GenericModrinthClient } from '@modrinth/api-client'
import { browser } from 'wxt/browser'

import { RequestCacheFeature } from './features/cache'
import { RequestThrottleFeature } from './features/throttle'

export const USER_AGENT = `creeperkatze/modrinth-extras/${browser.runtime.getManifest().version} (contact@creeperkatze.dev)`

// The platform clients call the fetch they are given unbound, which a service worker rejects.
export const boundFetch: typeof globalThis.fetch = (...args) => globalThis.fetch(...args)

// Read on every call since the site refreshes and switches the token without reloading.
export function getAuthToken(): string {
	if (typeof document === 'undefined') return ''
	const cookie = document.cookie.split('; ').find((row) => row.startsWith('auth-token='))
	return cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : ''
}

const requestCache = new RequestCacheFeature()
let lastToken: string | null = null

// Cached responses belong to whoever was signed in, so they go with the token.
function trackToken(token: string): string {
	if (lastToken !== null && token !== lastToken) requestCache.clear()
	lastToken = token
	return token
}

// Features run from last to first, so cache hits return before the throttle queues anything.
export const modrinthClient = new GenericModrinthClient({
	userAgent: USER_AGENT,
	features: [
		new RequestThrottleFeature(),
		requestCache,
		new AuthFeature({
			token: async () =>
				trackToken(
					typeof document === 'undefined' ? await getBackgroundAuthToken() : getAuthToken(),
				),
			tokenPrefix: '',
		} as AuthConfig),
	],
})

// Uses the cookies API since document is unavailable in service workers
export async function getBackgroundAuthToken(): Promise<string> {
	try {
		const cookie = await browser.cookies.get({ url: 'https://modrinth.com', name: 'auth-token' })
		return cookie?.value ? decodeURIComponent(cookie.value) : ''
	} catch {
		return ''
	}
}
