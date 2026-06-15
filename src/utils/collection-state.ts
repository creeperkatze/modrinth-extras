import type { Labrinth } from '@modrinth/api-client'
import { ref } from 'vue'

import { modrinthClient } from './api'

export const collections = ref<Labrinth.Collections.Collection[] | null>(null)

let initPromise: Promise<void> | null = null

export async function initCollections(): Promise<void> {
	if (collections.value !== null) return
	if (initPromise) return initPromise
	initPromise = (async () => {
		try {
			const user = await modrinthClient.request<Labrinth.Users.v2.User>('/user', {
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

export async function toggleProjectInCollection(
	collection: Labrinth.Collections.Collection,
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
