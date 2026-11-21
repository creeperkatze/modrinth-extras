import type { Labrinth } from '@modrinth/api-client'

import { chunkIdsForQuery } from '../../api/chunk-ids'
import { modrinthClient } from '../../api/client'
import { fetchGameVersionTags } from '../../api/tags'

// What an instance can hold, each in its own folder
export type ContentKind = 'mod' | 'resourcepack' | 'shader' | 'datapack'

export const KIND_FOLDERS: Record<ContentKind, string> = {
	mod: 'mods',
	resourcepack: 'resourcepacks',
	shader: 'shaderpacks',
	// Where the Modrinth App keeps them, to be added to worlds
	datapack: 'datapacks',
}

// The loaders a .mrpack can name
export const MOD_LOADERS = ['fabric', 'neoforge', 'forge', 'quilt'] as const
export type ModLoader = (typeof MOD_LOADERS)[number]

export interface CollectionProject {
	id: string
	slug: string
	name: string
	iconUrl: string | null
	// Null for plugins and modpacks, which don't go into an instance
	kind: ContentKind | null
	loaders: string[]
	gameVersions: string[]
}

export interface Selection {
	gameVersion: string
	loader: ModLoader
}

// Projects that are both a mod and a data pack are installed as mods
function contentKind(types: string[]): ContentKind | null {
	if (types.includes('mod')) return 'mod'
	if (types.includes('resourcepack')) return 'resourcepack'
	if (types.includes('shader')) return 'shader'
	if (types.includes('datapack')) return 'datapack'
	return null
}

export function toCollectionProject(project: Labrinth.Projects.v3.Project): CollectionProject {
	const gameVersions = project.game_versions
	return {
		id: project.id,
		slug: project.slug ?? project.id,
		name: project.name,
		iconUrl: project.icon_url ?? null,
		kind: contentKind(project.project_types),
		loaders: project.loaders,
		gameVersions: Array.isArray(gameVersions) ? (gameVersions as string[]) : [],
	}
}

export async function fetchProjects(ids: string[]): Promise<CollectionProject[]> {
	const projects = await Promise.all(
		chunkIdsForQuery(ids).map((chunk) => modrinthClient.labrinth.projects_v3.getMultiple(chunk)),
	)
	return projects.flat().map(toCollectionProject)
}

// The followed projects page has no collection behind it
async function collectionProjectIds(collectionId: string): Promise<string[]> {
	if (collectionId !== 'following') {
		return (await modrinthClient.labrinth.collections.get(collectionId)).projects
	}
	const user = await modrinthClient.labrinth.users_v3.getAuthenticated()
	const follows = await modrinthClient.request<Labrinth.Projects.v2.Project[]>(
		`/user/${user.id}/follows`,
		{ api: 'labrinth', version: 2 },
	)
	return follows.map((project) => project.id)
}

export async function loadCollection(collectionId: string): Promise<CollectionProject[]> {
	const projects = await fetchProjects(await collectionProjectIds(collectionId))
	return projects.sort((a, b) => a.name.localeCompare(b.name))
}

// Judged from what the project lists overall, the exact version is looked up afterwards
export function mightSupport(project: CollectionProject, selection: Selection): boolean {
	if (!project.kind || !project.gameVersions.includes(selection.gameVersion)) return false
	return project.kind !== 'mod' || project.loaders.includes(selection.loader)
}

export async function fetchReleaseVersions(): Promise<string[]> {
	const versions = await fetchGameVersionTags()
	return versions.filter((version) => version.version_type === 'release').map((v) => v.version)
}

// The pick most projects support, the newest version winning a tie since the list is newest first
export function bestSelection(projects: CollectionProject[], releases: string[]): Selection | null {
	let best: { selection: Selection; count: number } | null = null
	for (const gameVersion of releases) {
		for (const loader of MOD_LOADERS) {
			const selection = { gameVersion, loader }
			const count = projects.filter((project) => mightSupport(project, selection)).length
			if (count > (best?.count ?? 0)) best = { selection, count }
		}
	}
	return best?.selection ?? null
}
