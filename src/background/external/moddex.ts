export type ModdexReviewSort = 'created_at' | 'rating' | 'helpful_votes'

export interface ModdexReview {
	id: number
	title: string | null
	content: string | null
	rating: number
	gameplay_rating: number | null
	performance_rating: number | null
	aesthetics_rating: number | null
	minecraft_version: string | null
	playtime_hours: number | null
	play_status: string | null
	pack_version: string | null
	helpful_votes: number
	unhelpful_votes: number
	is_verified_developer: boolean
	author: { id: number; name: string }
	created_at: string
	edited_at: string | null
	public_moderator_note: string | null
}

export interface ModdexReviewsPage {
	reviews: ModdexReview[]
	page: number
	lastPage: number
	total: number
	projectUrl: string
}

export type ModdexReviewsResult =
	| { ok: true; data: ModdexReviewsPage }
	| { ok: false; error: 'no-token' | 'invalid-token' | 'not-found' | 'rate-limited' | 'failed' }

const BASE_URL = 'https://moddex.gg'

async function fetchPage(
	kind: 'mod' | 'modpack',
	slug: string,
	token: string,
	sort: ModdexReviewSort,
	page: number,
): Promise<Response> {
	const params = new URLSearchParams({
		sort,
		direction: 'desc',
		per_page: '15',
		page: String(page),
	})
	return fetch(`${BASE_URL}/api/v1/${kind}s/${encodeURIComponent(slug)}/reviews?${params}`, {
		headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
	})
}

export async function fetchModdexReviews(
	slug: string,
	isModpack: boolean,
	token: string,
	sort: ModdexReviewSort,
	page: number,
): Promise<ModdexReviewsResult> {
	if (!token) return { ok: false, error: 'no-token' }

	// Modrinth types don't always line up with ModDex, so fall back to the other kind.
	const kinds: ('mod' | 'modpack')[] = isModpack ? ['modpack', 'mod'] : ['mod', 'modpack']
	for (const kind of kinds) {
		const res = await fetchPage(kind, slug, token, sort, page)
		if (res.status === 401) return { ok: false, error: 'invalid-token' }
		if (res.status === 429) return { ok: false, error: 'rate-limited' }
		if (res.status === 404) continue
		if (!res.ok) throw new Error(`HTTP ${res.status}`)

		const body = (await res.json()) as {
			data: ModdexReview[]
			meta: { current_page: number; last_page: number; total: number }
		}
		return {
			ok: true,
			data: {
				reviews: body.data,
				page: body.meta.current_page,
				lastPage: body.meta.last_page,
				total: body.meta.total,
				projectUrl: `${BASE_URL}/${kind}/${encodeURIComponent(slug)}`,
			},
		}
	}
	return { ok: false, error: 'not-found' }
}
