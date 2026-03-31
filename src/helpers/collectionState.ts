import { ref } from 'vue'

import { apiFetch } from './api'

export interface Collection {
	id: string
	name: string
	projects: string[]
}

export const collections = ref<Collection[] | null>(null)

const projectIdCache = new Map<string, string>()

let initPromise: Promise<void> | null = null

export async function initCollections(): Promise<void> {
	if (collections.value !== null) return
	if (initPromise) return initPromise
	initPromise = (async () => {
		try {
			const user = (await apiFetch('user')) as { id: string } | null
			if (!user?.id) {
				collections.value = []
				return
			}
			const cols = (await apiFetch(`user/${user.id}/collections`, {
				apiVersion: 3,
			})) as Collection[]
			collections.value = cols ?? []
		} catch (err) {
			console.error('[Modrinth Extras] Failed to fetch collections:', err)
			collections.value = []
		}
	})()
	return initPromise
}

export async function getProjectId(slug: string): Promise<string | null> {
	if (projectIdCache.has(slug)) return projectIdCache.get(slug)!
	try {
		const project = (await apiFetch(`project/${slug}`)) as { id: string }
		projectIdCache.set(slug, project.id)
		return project.id
	} catch (err) {
		console.error(`[Modrinth Extras] Failed to fetch project ID for ${slug}:`, err)
		return null
	}
}

export async function toggleProjectInCollection(
	collection: Collection,
	projectId: string,
): Promise<void> {
	const has = collection.projects.includes(projectId)
	const newProjects = has
		? collection.projects.filter((id) => id !== projectId)
		: [...collection.projects, projectId]

	const original = collection.projects
	collection.projects = newProjects

	try {
		await apiFetch(`collection/${collection.id}`, {
			method: 'PATCH',
			apiVersion: 3,
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ new_projects: newProjects }),
		})
	} catch (err) {
		collection.projects = original
		throw err
	}
}
