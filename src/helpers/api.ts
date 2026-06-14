import { type AuthConfig, AuthFeature, GenericModrinthClient } from '@modrinth/api-client'
import { browser } from 'wxt/browser'

const USER_AGENT = `creeperkatze/modrinth-extras/${browser.runtime.getManifest().version} (contact@creeperkatze.dev)`

let cachedToken: string | null = null

export function getAuthToken(): string {
	if (cachedToken !== null) return cachedToken
	if (typeof document === 'undefined') return ''
	const cookie = document.cookie.split('; ').find((row) => row.startsWith('auth-token='))
	cachedToken = cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : ''
	return cachedToken
}

export function invalidateTokenCache() {
	cachedToken = null
}

export const modrinthClient = new GenericModrinthClient({
	userAgent: USER_AGENT,
	features: [
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
