import type { Labrinth } from '@modrinth/api-client'
import { ref } from 'vue'

import { modrinthClient } from './api'

export type Collection = Labrinth.Collections.Collection

export const collections = ref<Collection[] | null>(null)

const projectIdCache = new Map<string, string>()

let initPromise: Promise<void> | null = null

export async function initCollections(): Promise<void> {
	if (collections.value !== null) return
	if (initPromise) return initPromise
	initPromise = (async () => {
		try {
			const user = await modrinthClient.request<{ id: string }>('/user', {
				api: 'labrinth',
				version: 2,
			})
			if (!user?.id) {
				collections.value = []
				return
			}
			const cols = await modrinthClient.labrinth.users_v2.getCollections(user.id)
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
		const project = await modrinthClient.labrinth.projects_v3.get(slug)
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
		await modrinthClient.labrinth.collections.edit(collection.id, {
			new_projects: newProjects,
		})
	} catch (err) {
		collection.projects = original
		throw err
	}
}
