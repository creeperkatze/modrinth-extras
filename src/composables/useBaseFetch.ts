const API_BASE = 'https://api.modrinth.com'

let cachedToken: string | null = null

function getToken(): string {
	if (cachedToken !== null) return cachedToken
	const cookie = document.cookie.split('; ').find((row) => row.startsWith('auth-token='))
	cachedToken = cookie ? decodeURIComponent(cookie.split('=').slice(1).join('=')) : ''
	return cachedToken
}

export function invalidateTokenCache() {
	cachedToken = null
}

// Browser-compatible drop-in for Nuxt's useBaseFetch.
export async function useBaseFetch(
	url: string,
	options: RequestInit & { apiVersion?: number } = {},
): Promise<unknown> {
	const { apiVersion = 2, ...fetchOptions } = options as RequestInit & { apiVersion?: number }
	const token = getToken()

	const res = await fetch(`${API_BASE}/v${apiVersion}/${url}`, {
		...fetchOptions,
		headers: {
			...(token ? { Authorization: token } : {}),
			...((fetchOptions.headers as Record<string, string>) ?? {}),
		},
	})

	if (res.status === 204 || res.headers.get('content-length') === '0') return null
	if (!res.ok) throw new Error(`Modrinth API ${res.status}: ${url}`)
	return res.json()
}
