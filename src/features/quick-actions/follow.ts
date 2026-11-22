import { ref } from 'vue'

import { modrinthClient } from '../../api/client'

export const followUserId = ref<string | null | undefined>(undefined)
export const followedSlugs = ref<Set<string> | null>(null)

let initPromise: Promise<void> | null = null

export async function initFollowState(): Promise<void> {
	if (followUserId.value !== undefined) return
	if (initPromise) return initPromise
	initPromise = (async () => {
		try {
			const user = await modrinthClient.labrinth.users_v3.getAuthenticated()
			followUserId.value = user?.id ?? null
			if (!followUserId.value) return
		} catch (err) {
			console.error('[Modrinth Extras] Failed to fetch user for follow state:', err)
			followUserId.value = null
			return
		}
		try {
			const follows = await modrinthClient.labrinth.users_v2.getFollowedProjects(followUserId.value)
			followedSlugs.value = new Set(follows.map((p) => p.slug))
		} catch (err) {
			console.error('[Modrinth Extras] Failed to fetch followed projects:', err)
			followedSlugs.value = new Set()
		}
	})()
	return initPromise
}

export async function toggleFollow(projectSlug: string): Promise<void> {
	const following = followedSlugs.value?.has(projectSlug) ?? false
	await modrinthClient.request(`/project/${projectSlug}/follow`, {
		api: 'labrinth',
		version: 2,
		method: following ? 'DELETE' : 'POST',
	})
	if (following) followedSlugs.value?.delete(projectSlug)
	else followedSlugs.value?.add(projectSlug)
}
