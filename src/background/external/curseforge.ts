import CurseForgeClient, { GameId, type Mod, ModsSearchSortField } from 'curseforge-js'

import { boundFetch, USER_AGENT } from '../../utils/api'
import { namesMatch, pickBestMatch, type PlatformMatch } from '../../utils/platforms'

// CurseForge's API needs a key that cannot ship in a public extension; api.curse.tools mirrors it keylessly.
const client = new CurseForgeClient({
	baseUrl: 'https://api.curse.tools',
	userAgent: USER_AGENT,
	fetch: boundFetch,
})

const SEARCH_PAGE_SIZE = 25

function toMatch(mod: Mod): PlatformMatch {
	return {
		platform: 'curseforge',
		name: mod.name,
		url: mod.links.websiteUrl,
		iconUrl: mod.logo?.thumbnailUrl ?? mod.logo?.url ?? null,
		downloads: mod.downloadCount,
	}
}

export async function findCurseForgeProject(
	title: string,
	slug: string,
): Promise<PlatformMatch | null> {
	// The slug lookup only hits when both platforms use the same slug, so a title search backs it up.
	const [bySlug, byTitle] = await Promise.allSettled([
		client.mods.search({ gameId: GameId.Minecraft, slug }),
		client.mods.search({
			gameId: GameId.Minecraft,
			searchFilter: title,
			pageSize: SEARCH_PAGE_SIZE,
			sortField: ModsSearchSortField.Popularity,
			sortOrder: 'desc',
		}),
	])

	// Either search alone is enough to match on, so only a double failure is worth reporting.
	if (bySlug.status === 'rejected' && byTitle.status === 'rejected') throw byTitle.reason

	const candidates = [
		...(bySlug.status === 'fulfilled' ? (bySlug.value.data ?? []) : []),
		...(byTitle.status === 'fulfilled' ? (byTitle.value.data ?? []) : []),
	]
	const mod = pickBestMatch(
		candidates,
		(candidate) => candidate.name,
		(candidate) => candidate.slug,
		title,
		slug,
	)

	return mod ? toMatch(mod) : null
}

export async function findCurseForgeUser(username: string): Promise<PlatformMatch | null> {
	// CurseForge has no author search, so authors are only reachable via the mods they are credited on.
	const response = await client.mods.search({
		gameId: GameId.Minecraft,
		searchFilter: username,
		pageSize: 50,
		sortField: ModsSearchSortField.Popularity,
		sortOrder: 'desc',
	})

	for (const mod of response.data ?? []) {
		const author = mod.authors?.find((candidate) => namesMatch(candidate.name, username))
		if (author) {
			return {
				platform: 'curseforge',
				name: author.name,
				url: author.url,
				iconUrl: null,
			}
		}
	}

	return null
}
