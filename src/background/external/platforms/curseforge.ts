import CurseForgeClient, { GameId, type Mod, ModsSearchSortField } from 'curseforge-js'

import { boundFetch, USER_AGENT } from '../../../api/client'
import {
	type MatchableProject,
	matchProject,
	namesMatch,
	type PlatformMatch,
} from '../../../features/platforms/matching'
import { backgroundQueries } from '../../query'

// CurseForge's API needs a key that cannot ship in a public extension; api.curse.tools mirrors it keylessly.
const client = new CurseForgeClient({
	baseUrl: 'https://api.curse.tools',
	userAgent: USER_AGENT,
	fetch: boundFetch,
})

const SEARCH_PAGE_SIZE = 25

export interface CurseForgeComment {
	key: string
	authorName: string
	authorUrl: string
	authorAvatarUrl: string | null
	isProjectAuthor: boolean
	html: string
	createdAt: string
	edited: boolean
	pinned: boolean
	replies: CurseForgeComment[]
}

export interface CurseForgeCommentsPage {
	comments: CurseForgeComment[]
	projectUrl: string
	commentCount: number
	pageSize: number
	page: number
	lastPage: number
}

export type CurseForgeCommentsResult =
	| { ok: true; data: CurseForgeCommentsPage }
	| { ok: false; error: 'not-found' | 'failed' }

// The comments come from the website's own API, which the official one has no counterpart for.
interface RawComment {
	id: number
	renderedHtml: string
	author: { id: number; username: string; displayName?: string; twitchAvatarUrl?: string | null }
	datePosted: number
	dateEdited?: number
	isPinned?: boolean
	replies?: RawComment[]
}

interface RawCommentsResponse {
	data: RawComment[]
	pagination: { index: number; totalCount: number; pageSize: number }
}

// The official API leaves this field out of its types.
type ModWithComments = Mod & { hasCommentsEnabled?: boolean }

function toMatch(mod: Mod): PlatformMatch {
	return {
		platform: 'curseforge',
		name: mod.name,
		url: mod.links.websiteUrl,
		iconUrl: mod.logo?.thumbnailUrl ?? mod.logo?.url ?? null,
		downloads: mod.downloadCount,
	}
}

function findCurseForgeMod(project: MatchableProject): Promise<ModWithComments | null> {
	return backgroundQueries.fetchQuery({
		queryKey: ['curseforge-mod', project.slug],
		queryFn: () => searchCurseForgeMod(project),
	})
}

async function searchCurseForgeMod(project: MatchableProject): Promise<ModWithComments | null> {
	// The slug lookup only hits when both platforms use the same slug, so a title search backs it up.
	const [bySlug, byTitle] = await Promise.allSettled([
		client.mods.search({ gameId: GameId.Minecraft, slug: project.slug }),
		client.mods.search({
			gameId: GameId.Minecraft,
			searchFilter: project.name,
			pageSize: SEARCH_PAGE_SIZE,
			sortField: ModsSearchSortField.Popularity,
			sortOrder: 'desc',
		}),
	])

	// Either search alone is enough to match on, so only a double failure is worth reporting.
	if (bySlug.status === 'rejected' && byTitle.status === 'rejected') throw byTitle.reason

	const mods = [
		...(bySlug.status === 'fulfilled' ? (bySlug.value.data ?? []) : []),
		...(byTitle.status === 'fulfilled' ? (byTitle.value.data ?? []) : []),
	]
	return matchProject(
		project,
		mods.map((candidate) => ({
			item: candidate,
			name: candidate.name,
			slug: candidate.slug,
			authors: candidate.authors.map((author) => author.name),
		})),
	)
}

// Twitch avatars come with a size placeholder in the URL.
function avatarUrl(url: string | null | undefined): string | null {
	return url ? url.replace('{0}', '150x150') : null
}

function toComment(comment: RawComment, authorIds: Set<number>): CurseForgeComment {
	return {
		key: String(comment.id),
		authorName: comment.author.displayName || comment.author.username,
		authorUrl: `https://www.curseforge.com/members/${encodeURIComponent(comment.author.username)}`,
		authorAvatarUrl: avatarUrl(comment.author.twitchAvatarUrl),
		isProjectAuthor: authorIds.has(comment.author.id),
		html: comment.renderedHtml,
		createdAt: new Date(comment.datePosted).toISOString(),
		edited: comment.dateEdited != null,
		pinned: comment.isPinned ?? false,
		// Replies arrive newest first, but read as a conversation from the oldest.
		replies: (comment.replies ?? [])
			.toSorted((a, b) => a.datePosted - b.datePosted)
			.map((reply) => toComment(reply, authorIds)),
	}
}

// Pages are counted from 0 there. Comments are public, so cookies are left out.
async function getCommentsPage(modId: number, page: number): Promise<RawCommentsResponse> {
	const response = await boundFetch(
		`https://www.curseforge.com/api/v1/mods/${modId}/comments?page=${page - 1}`,
		{ headers: { 'User-Agent': USER_AGENT }, credentials: 'omit' },
	)
	if (!response.ok) throw new Error(`CurseForge comments responded with ${response.status}`)
	return (await response.json()) as RawCommentsResponse
}

export async function findCurseForgeProject(
	project: MatchableProject,
): Promise<PlatformMatch | null> {
	const mod = await findCurseForgeMod(project)
	return mod ? toMatch(mod) : null
}

export async function hasCurseForgeComments(project: MatchableProject): Promise<boolean> {
	const mod = await findCurseForgeMod(project)
	return mod?.hasCommentsEnabled ?? false
}

export async function fetchCurseForgeComments(
	project: MatchableProject,
	page: number,
): Promise<CurseForgeCommentsResult> {
	const mod = await findCurseForgeMod(project)
	if (!mod) return { ok: false, error: 'not-found' }

	const { data, pagination } = await getCommentsPage(mod.id, page)
	const lastPage = Math.max(1, Math.ceil(pagination.totalCount / pagination.pageSize))

	const authorIds = new Set(mod.authors.map((author) => author.id))
	return {
		ok: true,
		data: {
			comments: data.map((comment) => toComment(comment, authorIds)),
			projectUrl: mod.links.websiteUrl,
			commentCount: pagination.totalCount,
			pageSize: pagination.pageSize,
			page,
			lastPage,
		},
	}
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
