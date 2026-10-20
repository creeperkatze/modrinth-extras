import ModDexClient, {
	ModDexNotFoundError,
	ModDexRateLimitError,
	type RatingStep,
	type Review,
	type ReviewCategories,
	type ReviewSort,
} from 'moddex-js'
import { browser } from 'wxt/browser'

const REF = 'modrinth-extras'

const client = new ModDexClient({
	client: `modrinth-extras/${browser.runtime.getManifest().version}`,
})

export interface ModdexSummary {
	average: number
	totalRatings: number
	categories: ReviewCategories
}

export interface ModdexReviewsPage {
	reviews: Review[]
	summary: ModdexSummary | null
	page: number
	lastPage: number
	writeReviewUrl: string
}

export type ModdexReviewsResult =
	| { ok: true; data: ModdexReviewsPage }
	| { ok: false; error: 'not-found' | 'rate-limited' | 'failed' }

function withRef(link: string): string {
	const url = new URL(link)
	url.searchParams.set('ref', REF)
	return url.href
}

function histogramAverage(histogram: RatingStep[]): number | null {
	const count = histogram.reduce((sum, step) => sum + step.count, 0)
	if (!count) return null
	return histogram.reduce((sum, step) => sum + step.rating * step.count, 0) / count
}

// The project is a Modrinth slug or ID, which ModDex resolves without needing the project type.
export async function fetchModdexReviews(
	project: string,
	sort: ReviewSort,
	page: number,
): Promise<ModdexReviewsResult> {
	try {
		// The review list only carries the overall rating, so category ratings need the project too.
		const [list, details] = await Promise.all([
			client.lookup.listReviews('modrinth', project, { sort, page }),
			page === 1 ? client.lookup.get('modrinth', project, { include: ['ratings'] }) : null,
		])
		const { rating, links } = list.meta.project
		const categories = details?.data.ratings?.categories
		return {
			ok: true,
			data: {
				reviews: list.data,
				summary:
					categories && rating.average !== null
						? {
								average: rating.average,
								totalRatings: rating.count,
								categories: {
									gameplay: histogramAverage(categories.gameplay),
									performance: histogramAverage(categories.performance),
									aesthetics: histogramAverage(categories.aesthetics),
								},
							}
						: null,
				page: list.meta.current_page,
				lastPage: list.meta.last_page,
				writeReviewUrl: withRef(links.write_review),
			},
		}
	} catch (err) {
		if (err instanceof ModDexNotFoundError) return { ok: false, error: 'not-found' }
		if (err instanceof ModDexRateLimitError) return { ok: false, error: 'rate-limited' }
		throw err
	}
}
