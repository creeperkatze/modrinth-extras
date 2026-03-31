import { ref } from 'vue'

import { apiFetch } from './api'

export const followUserId = ref<string | null | undefined>(undefined)
export const followedSlugs = ref<Set<string> | null>(null)

let initPromise: Promise<void> | null = null

export async function initFollowState(): Promise<void> {
	if (followUserId.value !== undefined) return
	if (initPromise) return initPromise
	initPromise = (async () => {
		try {
			const user = (await apiFetch('user')) as { id: string } | null
			followUserId.value = user?.id ?? null
			if (!followUserId.value) return
		} catch (err) {
			console.error('[Modrinth Extras] Failed to fetch user for follow state:', err)
			followUserId.value = null
			return
		}
		try {
			const follows = (await apiFetch(`user/${followUserId.value}/follows`)) as {
				slug: string
			}[]
			followedSlugs.value = new Set(follows.map((p) => p.slug))
		} catch (err) {
			console.error('[Modrinth Extras] Failed to fetch followed projects:', err)
			followedSlugs.value = new Set()
		}
	})()
	return initPromise
}
