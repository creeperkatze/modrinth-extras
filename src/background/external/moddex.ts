import ModDexClient, {
	ModDexAuthenticationError,
	ModDexNotFoundError,
	ModDexRateLimitError,
	type Review,
	type ReviewSortField,
} from 'moddex-js'

export interface ModdexReviewsPage {
	reviews: Review[]
	page: number
	lastPage: number
	total: number
	projectUrl: string
}

export type ModdexReviewsResult =
	| { ok: true; data: ModdexReviewsPage }
	| { ok: false; error: 'no-token' | 'invalid-token' | 'not-found' | 'rate-limited' | 'failed' }

const CACHE_TTL_MS = 5 * 60_000

let client: ModDexClient | null = null
let clientToken = ''

function getClient(token: string): ModDexClient {
	if (!client || clientToken !== token) {
		client = new ModDexClient({ token, cache: { ttlMs: CACHE_TTL_MS } })
		clientToken = token
	}
	return client
}

export async function fetchModdexReviews(
	slug: string,
	isModpack: boolean,
	token: string,
	sort: ReviewSortField,
	page: number,
): Promise<ModdexReviewsResult> {
	if (!token) return { ok: false, error: 'no-token' }

	const moddex = getClient(token)
	// Modrinth types don't always line up with ModDex, so fall back to the other kind.
	const kinds = isModpack ? (['modpack', 'mod'] as const) : (['mod', 'modpack'] as const)
	for (const kind of kinds) {
		try {
			const api = kind === 'modpack' ? moddex.modpacks : moddex.mods
			const res = await api.listReviews(slug, { sort, direction: 'desc', per_page: 15, page })
			return {
				ok: true,
				data: {
					reviews: res.data,
					page: res.meta.current_page,
					lastPage: res.meta.last_page,
					total: res.meta.total,
					projectUrl: `https://moddex.gg/${kind}/${encodeURIComponent(slug)}`,
				},
			}
		} catch (err) {
			if (err instanceof ModDexNotFoundError) continue
			if (err instanceof ModDexAuthenticationError) return { ok: false, error: 'invalid-token' }
			if (err instanceof ModDexRateLimitError) return { ok: false, error: 'rate-limited' }
			throw err
		}
	}
	return { ok: false, error: 'not-found' }
}
