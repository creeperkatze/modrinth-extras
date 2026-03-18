import { browser } from 'wxt/browser'

const API_BASE = 'https://api.modrinth.com'
const USER_AGENT = `creeperkatze/modrinth-extras/${browser.runtime.getManifest().version} (contact@creeperkatze.de)`

export async function getAuthToken(): Promise<string> {
	try {
		const cookie = await browser.cookies.get({ url: 'https://modrinth.com', name: 'auth-token' })
		return cookie?.value ? decodeURIComponent(cookie.value) : ''
	} catch {
		return ''
	}
}

export async function apiFetch(
	url: string,
	options: RequestInit & { apiVersion?: number } = {},
): Promise<unknown> {
	const { apiVersion = 2, ...fetchOptions } = options as RequestInit & { apiVersion?: number }
	const token = await getAuthToken()

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
