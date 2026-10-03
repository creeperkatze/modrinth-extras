import { type AuthConfig, AuthFeature, GenericModrinthClient } from '@modrinth/api-client'
import { browser } from 'wxt/browser'

import { RequestCacheFeature } from './features/cache'
import { RequestThrottleFeature } from './features/throttle'

export const USER_AGENT = `creeperkatze/modrinth-extras/${browser.runtime.getManifest().version} (contact@creeperkatze.dev)`

// The platform clients call the fetch they are given unbound, which a service worker rejects.
export const boundFetch: typeof globalThis.fetch = (...args) => globalThis.fetch(...args)

let cachedToken: string | null = null

export function getAuthToken(): string {
	if (cachedToken !== null) return cachedToken
	if (typeof document === 'undefined') return ''
	const cookie = document.cookie.split('; ').find((row) => row.startsWith('auth-token='))
	cachedToken = cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : ''
	return cachedToken
}

const requestCache = new RequestCacheFeature()

// Cached responses belong to whoever was signed in, so they go with the token.
export function invalidateTokenCache() {
	cachedToken = null
	requestCache.clear()
}

// Features run from last to first, so cache hits return before the throttle queues anything.
export const modrinthClient = new GenericModrinthClient({
	userAgent: USER_AGENT,
	features: [
		new RequestThrottleFeature(),
		requestCache,
		new AuthFeature({
			token: async () =>
				typeof document === 'undefined' ? getBackgroundAuthToken() : getAuthToken(),
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
