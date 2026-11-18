import { ModrinthApiError } from '@modrinth/api-client'

import { modrinthClient } from '../api/client'
import {
	getMatchableProject,
	type MatchableProject,
	matchProject,
} from '../features/platforms/matching'
import type { ModrinthMatch, PlatformPage } from '../features/platforms/pages'
import { getCurseForgeSource } from './external/platforms/curseforge'
import { getHangarSource } from './external/platforms/hangar'
import { getSpigotSource } from './external/platforms/spigot'
import { backgroundQueries } from './query'

const SEARCH_LIMIT = 10

function getSource(page: PlatformPage): Promise<MatchableProject | null> {
	switch (page.platform) {
		case 'curseforge':
			return getCurseForgeSource(page.slug)
		case 'hangar':
			return getHangarSource(page.owner, page.slug)
		case 'spigot':
			return getSpigotSource(page.id)
	}
}

// Checked in the same direction as the Other platforms card, with Modrinth as the reference
function sameProject(project: MatchableProject, source: MatchableProject): boolean {
	return matchProject(project, [{ item: true, ...source }]) !== null
}

async function findBySlug(source: MatchableProject): Promise<ModrinthMatch | null> {
	try {
		const project = await modrinthClient.labrinth.projects_v3.get(source.slug)
		if (!project.slug || !sameProject(await getMatchableProject(project), source)) return null
		return {
			slug: project.slug,
			name: project.name,
			iconUrl: project.icon_url ?? null,
			downloads: project.downloads,
			projectType: project.project_types[0] ?? 'mod',
		}
	} catch (err) {
		if (err instanceof ModrinthApiError && err.statusCode === 404) return null
		throw err
	}
}

async function findBySearch(source: MatchableProject): Promise<ModrinthMatch | null> {
	const results = await modrinthClient.labrinth.projects_v3.search({
		query: source.name,
		limit: SEARCH_LIMIT,
	})
	for (const hit of results.hits) {
		if (!hit.slug) continue
		const authors = [hit.author, hit.organization].filter((name): name is string => !!name)
		if (!sameProject({ name: hit.name, slug: hit.slug, authors }, source)) continue
		return {
			slug: hit.slug,
			name: hit.name,
			iconUrl: hit.icon_url,
			downloads: hit.downloads,
			projectType: hit.project_types[0] ?? 'mod',
		}
	}
	return null
}

async function findModrinthProject(page: PlatformPage): Promise<ModrinthMatch | null> {
	const source = await getSource(page)
	if (!source) return null
	return (await findBySlug(source)) ?? (await findBySearch(source))
}

export function findModrinthMatch(page: PlatformPage): Promise<ModrinthMatch | null> {
	return backgroundQueries.fetchQuery({
		queryKey: ['modrinth-match', page],
		queryFn: () => findModrinthProject(page),
	})
}
