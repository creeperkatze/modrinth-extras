import SpigetClient, { type Author, type Icon, type Resource, type ResourceReview } from 'spiget-js'

import { USER_AGENT } from '../../utils/api'
import { namesMatch, type PlatformMatch } from '../../utils/platforms'

// Spiget's CORS rules reject a custom User-Agent, so it goes in the header Spiget allows instead.
const spigetFetch: typeof globalThis.fetch = (input, init) => {
	const headers = new Headers(init?.headers)
	headers.set('Spiget-User-Agent', USER_AGENT)
	return globalThis.fetch(input, { ...init, headers })
}

const client = new SpigetClient({ fetch: spigetFetch })

const SEARCH_SIZE = 25
const REVIEWS_PAGE_SIZE = 10
const CACHE_TTL_MS = 5 * 60_000

export type SpigotReviewSort = '-date' | '+date' | '-rating.average' | '+rating.average'

export interface SpigotReview {
	key: string
	authorName: string | null
	authorUrl: string
	authorAvatarUrl: string | null
	rating: number
	message: string
	response: string | null
	version: string
	createdAt: string
}

export interface SpigotReviewsPage {
	reviews: SpigotReview[]
	resourceUrl: string
	average: number
	ratingCount: number
	page: number
	lastPage: number
}

export type SpigotReviewsResult =
	| { ok: true; data: SpigotReviewsPage }
	| { ok: false; error: 'not-found' | 'failed' }

interface CacheEntry<T> {
	expires: number
	value: Promise<T>
}

const resourceCache = new Map<string, CacheEntry<Resource | null>>()
const authorCache = new Map<number, CacheEntry<Author | null>>()

// Paging through reviews repeats the same search and authors, so both are cached for a while.
function cached<K, T>(cache: Map<K, CacheEntry<T>>, key: K, load: () => Promise<T>): Promise<T> {
	const now = Date.now()
	const hit = cache.get(key)
	if (hit && hit.expires > now) return hit.value

	for (const [staleKey, entry] of cache) {
		if (entry.expires <= now) cache.delete(staleKey)
	}
	const value = load()
	cache.set(key, { expires: now + CACHE_TTL_MS, value })
	value.catch(() => {
		if (cache.get(key)?.value === value) cache.delete(key)
	})
	return value
}

// The hosted icon is preferred over Spiget's inline base64 copy to keep the message small.
function resolveIcon(icon: Icon | undefined): string | null {
	if (icon?.url) return new URL(icon.url, 'https://www.spigotmc.org/').href
	if (icon?.data) return `data:image/png;base64,${icon.data}`
	return null
}

function resourceUrl(resource: Resource): string {
	return `https://www.spigotmc.org/resources/${resource.id}/`
}

function memberUrl(id: number): string {
	return `https://www.spigotmc.org/members/${id}/`
}

function toResourceMatch(resource: Resource): PlatformMatch {
	return {
		platform: 'spigot',
		name: resource.name,
		url: resourceUrl(resource),
		iconUrl: resolveIcon(resource.icon),
		downloads: resource.downloads,
	}
}

function toAuthorMatch(author: Author): PlatformMatch {
	return {
		platform: 'spigot',
		name: author.name,
		url: memberUrl(author.id),
		iconUrl: resolveIcon(author.icon),
	}
}

function findSpigotResource(title: string): Promise<Resource | null> {
	return cached(resourceCache, title, async () => {
		// Spiget resources have no slug, so the title is the only thing to match on.
		const response = await client.resources.search(title, {
			field: 'name',
			size: SEARCH_SIZE,
			sort: '-downloads',
		})
		return response.data?.find((candidate) => namesMatch(candidate.name, title)) ?? null
	})
}

// Deleted members can't be looked up anymore, so they resolve to null instead of failing the page.
function getAuthor(id: number): Promise<Author | null> {
	return cached(authorCache, id, () => client.authors.get(id).catch(() => null))
}

function decodeBase64(value: string): string {
	return new TextDecoder().decode(Uint8Array.from(atob(value), (char) => char.charCodeAt(0)))
}

function toReview(review: ResourceReview, author: Author | null): SpigotReview {
	return {
		key: `${review.author.id}-${review.date}`,
		authorName: author?.name ?? null,
		authorUrl: memberUrl(review.author.id),
		authorAvatarUrl: author ? resolveIcon(author.icon) : null,
		rating: review.rating.average,
		message: decodeBase64(review.message),
		response: review.responseMessage ? decodeBase64(review.responseMessage) : null,
		version: review.version,
		createdAt: new Date(review.date * 1000).toISOString(),
	}
}

export async function findSpigotProject(title: string): Promise<PlatformMatch | null> {
	const resource = await findSpigotResource(title)
	return resource ? toResourceMatch(resource) : null
}

export async function findSpigotUser(username: string): Promise<PlatformMatch | null> {
	const response = await client.authors.search(username, { field: 'name', size: SEARCH_SIZE })

	const author = response.data?.find((candidate) => namesMatch(candidate.name, username))
	return author ? toAuthorMatch(author) : null
}

export async function fetchSpigotReviews(
	title: string,
	sort: SpigotReviewSort,
	page: number,
): Promise<SpigotReviewsResult> {
	const resource = await findSpigotResource(title)
	if (!resource) return { ok: false, error: 'not-found' }

	const response = await client.resources.getReviews(resource.id, {
		size: REVIEWS_PAGE_SIZE,
		page,
		sort,
	})
	// Spiget only returns the reviewer's id, so names and avatars are looked up separately.
	const authors = await Promise.all(response.data.map((review) => getAuthor(review.author.id)))

	return {
		ok: true,
		data: {
			reviews: response.data.map((review, i) => toReview(review, authors[i] ?? null)),
			resourceUrl: resourceUrl(resource),
			average: resource.rating.average,
			ratingCount: resource.rating.count,
			page: response.pagination.index ?? page,
			lastPage: response.pagination.count ?? page,
		},
	}
}
