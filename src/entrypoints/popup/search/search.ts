import type { Labrinth } from '@modrinth/api-client'

import { modrinthClient } from '../../../api/client'

const SEARCHABLE_TYPES = ['mod', 'plugin', 'modpack', 'resourcepack', 'shader', 'datapack']

// Same filter syntax as the website's own search, leaving out servers
const TYPE_FILTER = `project_types IN [${SEARCHABLE_TYPES.map((type) => `\`${type}\``).join(', ')}]`

export async function searchProjects(
	query: string,
	limit: number,
): Promise<Labrinth.Search.v3.ResultSearchProject[]> {
	const results = await modrinthClient.labrinth.projects_v3.search({
		query,
		new_filters: TYPE_FILTER,
		limit,
	})
	return results.hits
}

export function searchPageUrl(query: string): string {
	return `/discover/mods?${new URLSearchParams({ q: query })}`
}
