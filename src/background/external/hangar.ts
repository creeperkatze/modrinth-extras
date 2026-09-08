import HangarClient, { HangarError, type Project } from 'hangarmc-js'

import { boundFetch, USER_AGENT } from '../../utils/api'
import { pickBestMatch, type PlatformMatch } from '../../utils/platforms'

const client = new HangarClient({ userAgent: USER_AGENT, fetch: boundFetch })

// Hangar caps paginated endpoints at 25 items per request.
const SEARCH_LIMIT = 25

function toMatch(project: Project): PlatformMatch {
	const { owner, slug } = project.namespace
	return {
		platform: 'hangar',
		name: project.name,
		url: `https://hangar.papermc.io/${owner}/${slug}`,
		iconUrl: project.avatarUrl || null,
		downloads: project.stats.downloads,
	}
}

export async function findHangarProject(
	title: string,
	slug: string,
): Promise<PlatformMatch | null> {
	const response = await client.projects.list({ query: title, limit: SEARCH_LIMIT })

	const project = pickBestMatch(
		response.result ?? [],
		(candidate) => candidate.name,
		(candidate) => candidate.namespace.slug,
		title,
		slug,
	)

	return project ? toMatch(project) : null
}

export async function findHangarUser(username: string): Promise<PlatformMatch | null> {
	try {
		const user = await client.users.get(username)
		return {
			platform: 'hangar',
			name: user.name,
			url: `https://hangar.papermc.io/${user.name}`,
			iconUrl: user.avatarUrl || null,
		}
	} catch (err) {
		if (err instanceof HangarError && err.status === 404) return null
		throw err
	}
}
