export async function getAuthToken(): Promise<string>
{
	try
	{
		const cookie = await chrome.cookies.get({ url: 'https://modrinth.com', name: 'auth-token' })
		return cookie?.value ? decodeURIComponent(cookie.value) : ''
	} catch
	{
		return ''
	}
}

export async function usePopupFetch(
	url: string,
	options: RequestInit & { apiVersion?: number } = {},
): Promise<any>
{
	const { apiVersion = 2, ...fetchOptions } = options as RequestInit & { apiVersion?: number }
	const token = await getAuthToken()

	const res = await fetch(`https://api.modrinth.com/v${apiVersion}/${url}`, {
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
