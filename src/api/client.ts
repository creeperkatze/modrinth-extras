import {
	type AuthConfig,
	AuthFeature,
	GenericModrinthClient,
	PanelVersionFeature,
	type RequestContext,
} from '@modrinth/api-client'
import { browser } from 'wxt/browser'

import { mockFeatures } from '../mocks'
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

// Extension pages like the popup have their own cookies, not modrinth.com's
function isExtensionPage(): boolean {
	return typeof location !== 'undefined' && location.protocol.endsWith('-extension:')
}

const requestCache = new RequestCacheFeature()
let lastToken: string | null = null

// Cached responses belong to whoever was signed in, so they go with the token.
function trackToken(token: string): string {
	if (lastToken !== null && token !== lastToken) requestCache.clear()
	lastToken = token
	return token
}

// Archon wants a Bearer token and a panel version, or it answers 401 and 426.
// Labrinth takes the bare token, and a custom header there would add a preflight.
class ArchonFeature extends PanelVersionFeature {
	override async execute<T>(next: () => Promise<T>, context: RequestContext): Promise<T> {
		const token = context.options.headers?.Authorization
		if (token && !token.startsWith('Bearer ')) {
			context.options.headers = { ...context.options.headers, Authorization: `Bearer ${token}` }
		}
		return super.execute(next, context)
	}

	override shouldApply(context: RequestContext): boolean {
		return context.options.api === 'archon'
	}
}

// Features run from last to first, so cache hits return before the throttle queues anything.
export const modrinthClient = new GenericModrinthClient({
	userAgent: USER_AGENT,
	features: [
		...mockFeatures(),
		new RequestThrottleFeature(),
		requestCache,
		// Listed before auth so it runs after it and sees the token
		new ArchonFeature(),
		new AuthFeature({
			token: async () =>
				trackToken(
					typeof document === 'undefined' || isExtensionPage()
						? await getBackgroundAuthToken()
						: getAuthToken(),
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
