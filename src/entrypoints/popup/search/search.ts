import type { Labrinth } from '@modrinth/api-client'

import { modrinthClient } from '../../../api/client'
import { ALL_TYPES, MOD_TYPE, PROJECT_TYPES, type ProjectType } from './project-types'

type SearchHit = Labrinth.Search.v3.ResultSearchProject

// Same filter syntax as the website's own search
function typeFilter(type: ProjectType | null): string {
	const types = type ? [type] : ALL_TYPES
	return `project_types IN [${types.map((t) => `\`${t.searchType}\``).join(', ')}]`
}

export async function searchProjects(
	query: string,
	type: ProjectType | null,
	limit: number,
	offset = 0,
): Promise<{ hits: SearchHit[]; total: number }> {
	const results = await modrinthClient.labrinth.projects_v3.search({
		query,
		new_filters: typeFilter(type),
		limit,
		offset,
	})
	return { hits: results.hits, total: results.total_hits }
}

// A project can have several types, so the picked one wins for links and downloads
export function hitType(hit: SearchHit, picked: ProjectType | null): ProjectType {
	if (picked && hit.project_types.includes(picked.searchType)) return picked
	const own = PROJECT_TYPES.find((type) => hit.project_types[0] === type.searchType)
	return own ?? MOD_TYPE
}

export function hitPath(hit: SearchHit, picked: ProjectType | null): string {
	return `/${hitType(hit, picked).id}/${hit.slug ?? hit.project_id}`
}

export function searchPageUrl(query: string, type: ProjectType | null): string {
	const path = (type ?? MOD_TYPE).discoverPath
	return query ? `${path}?${new URLSearchParams({ q: query })}` : path
}
