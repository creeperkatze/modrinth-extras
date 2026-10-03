import { AbstractFeature, ModrinthApiError, type RequestContext } from '@modrinth/api-client'

const DEFAULT_TTL_MS = 30_000
const TAG_TTL_MS = 60 * 60_000
const RATE_LIMIT_PAUSE_MS = 30_000

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

// A 429 without CORS headers reaches the page as a failure without a status.
function isRateLimited(error: unknown): boolean {
	if (!(error instanceof ModrinthApiError)) return false
	return error.statusCode === 429 || error.statusCode === undefined
}

// Every injection loads its own data, so identical GETs are shared instead of each hitting the API.
export class RequestCacheFeature extends AbstractFeature {
	private cache = new Map<string, CacheEntry>()
	private pausedUntil = 0

	constructor() {
		super({ name: 'request-cache' })
	}

	clear() {
		this.cache.clear()
	}

	async execute<T>(next: () => Promise<T>, context: RequestContext): Promise<T> {
		const isGet = (context.options.method ?? 'GET') === 'GET'
		const key = cacheKey(context)
		const now = Date.now()
		const hit = isGet ? this.cache.get(key) : undefined
		// Callers get their own copy so one component can't change another's data.
		if (hit && hit.expires > now) return structuredClone((await hit.value) as T)

		if (now < this.pausedUntil) {
			throw new ModrinthApiError('Paused after being rate limited', {
				statusCode: 429,
				context: context.path,
			})
		}

		if (!isGet) {
			// A change can make any cached response outdated.
			this.clear()
			return this.track(next())
		}

		for (const [staleKey, entry] of this.cache) {
			if (entry.expires <= now) this.cache.delete(staleKey)
		}
		const value = this.track(next())
		this.cache.set(key, { expires: now + ttlFor(context), value })
		value.catch(() => {
			if (this.cache.get(key)?.value === value) this.cache.delete(key)
		})
		return structuredClone(await value)
	}

	private async track<T>(request: Promise<T>): Promise<T> {
		try {
			return await request
		} catch (err) {
			if (isRateLimited(err)) this.pausedUntil = Date.now() + RATE_LIMIT_PAUSE_MS
			throw err
		}
	}
}
