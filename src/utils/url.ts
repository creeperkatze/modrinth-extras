export function parseUrl(url: string): URL | null {
	try {
		return new URL(url)
	} catch {
		return null
	}
}

export function withSearchParam(url: string, name: string, value: string): string {
	const parsed = new URL(url)
	parsed.searchParams.set(name, value)
	return parsed.href
}
