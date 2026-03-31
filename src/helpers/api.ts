import { browser } from 'wxt/browser'

const API_BASE = 'https://api.modrinth.com'
const USER_AGENT = `creeperkatze/modrinth-extras/${browser.runtime.getManifest().version} (contact@creeperkatze.de)`

export type ApiFetchOptions = RequestInit & { apiVersion?: number; token?: string }

let cachedToken: string | null = null

export function getAuthToken(): string {
	if (cachedToken !== null) return cachedToken
	const cookie = document.cookie.split('; ').find((row) => row.startsWith('auth-token='))
	cachedToken = cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : ''
	return cachedToken
}

export function invalidateTokenCache() {
	cachedToken = null
}

// Uses the cookies API since document is unavailable in service workers
export async function getBackgroundAuthToken(): Promise<string> {
	try {
		const cookie = await browser.cookies.get({ url: 'https://modrinth.com', name: 'auth-token' })
		return cookie?.value ? decodeURIComponent(cookie.value) : ''
	} catch {
		return ''
	}
}

export async function apiFetch(url: string, options: ApiFetchOptions = {}): Promise<unknown> {
	const { apiVersion = 2, token = getAuthToken(), ...fetchOptions } = options

	const res = await fetch(`${API_BASE}/v${apiVersion}/${url}`, {
		...fetchOptions,
		headers: {
			'User-Agent': USER_AGENT,
			...(token ? { Authorization: token } : {}),
			...((fetchOptions.headers as Record<string, string>) ?? {}),
		},
	})

	if (res.status === 204 || res.headers.get('content-length') === '0') return null
	if (!res.ok) throw new Error(`Modrinth API ${res.status}: ${url}`)
	return res.json()
}
