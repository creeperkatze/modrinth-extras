import { AbstractFeature, ModrinthApiError, type RequestContext } from '@modrinth/api-client'

const DEFAULT_TTL_MS = 30_000
const TAG_TTL_MS = 60 * 60_000

interface CacheEntry {
	expires: number
	value: Promise<unknown>
}

function cacheKey(context: RequestContext): string {
	const params = Object.entries(context.options.params ?? {}).sort(([a], [b]) => a.localeCompare(b))
	return `${context.url}?${JSON.stringify(params)}`
}

function ttlFor(context: RequestContext): number {
	return context.path.startsWith('/tag/') ? TAG_TTL_MS : DEFAULT_TTL_MS
}

// Every injection loads its own data, so identical GETs are shared instead of each hitting the API.
export class RequestCacheFeature extends AbstractFeature {
	private cache = new Map<string, CacheEntry>()

	constructor() {
		super({ name: 'request-cache' })
	}

	clear() {
		this.cache.clear()
	}

	async execute<T>(next: () => Promise<T>, context: RequestContext): Promise<T> {
		if ((context.options.method ?? 'GET') !== 'GET') {
			// A change can make any cached response outdated.
			this.clear()
			return next()
		}

		const key = cacheKey(context)
		const now = Date.now()
		const hit = this.cache.get(key)
		// Callers get their own copy so one component can't change another's data.
		if (hit && hit.expires > now) return structuredClone((await hit.value) as T)

		for (const [staleKey, entry] of this.cache) {
			if (entry.expires <= now) this.cache.delete(staleKey)
		}
		const value = next()
		this.cache.set(key, { expires: now + ttlFor(context), value })
		// A 404 won't change on retry, so only other failures are dropped from the cache.
		value.catch((err) => {
			const notFound = err instanceof ModrinthApiError && err.statusCode === 404
			if (!notFound && this.cache.get(key)?.value === value) this.cache.delete(key)
		})
		return structuredClone(await value)
	}
}
