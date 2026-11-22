import { storage } from '@wxt-dev/storage'
import { ref, shallowRef, watch } from 'vue'

interface CacheEntry<T> {
	value: T
	savedAt: number
}

function storageKey(key: string): `local:${string}` {
	return `local:popupCache:${key}`
}

// Shows the last result right away and refreshes it once older than maxAge. A null key loads nothing.
export function useCachedResource<T>(
	key: () => string | null,
	load: () => Promise<T>,
	maxAge = 5 * 60_000,
) {
	const data = shallowRef<T | undefined>()
	const savedAt = ref<number | null>(null)
	const loading = ref(false)
	const failed = ref(false)
	let currentKey: string | null = null

	async function save(value: T) {
		if (!currentKey) return
		data.value = value
		savedAt.value = Date.now()
		try {
			await storage.setItem<CacheEntry<T>>(storageKey(currentKey), {
				value,
				savedAt: savedAt.value,
			})
		} catch (err) {
			console.error(`[Modrinth Extras] Failed to cache ${currentKey}:`, err)
		}
	}

	let loadingKey: string | null = null

	async function refresh() {
		const requestKey = currentKey
		if (!requestKey || loadingKey === requestKey) return
		loadingKey = requestKey
		loading.value = true
		failed.value = false
		try {
			const value = await load()
			if (requestKey === currentKey) await save(value)
		} catch (err) {
			if (requestKey !== currentKey) return
			failed.value = true
			console.error(`[Modrinth Extras] Failed to load ${requestKey}:`, err)
		} finally {
			if (loadingKey === requestKey) loadingKey = null
			if (requestKey === currentKey) loading.value = false
		}
	}

	watch(
		key,
		async (newKey) => {
			currentKey = newKey
			data.value = undefined
			savedAt.value = null
			failed.value = false
			if (!newKey) return

			const cached = await storage.getItem<CacheEntry<T>>(storageKey(newKey))
			if (newKey !== currentKey) return
			if (cached) {
				data.value = cached.value
				savedAt.value = cached.savedAt
			}
			if (!cached || Date.now() - cached.savedAt > maxAge) await refresh()
		},
		{ immediate: true },
	)

	return { data, savedAt, loading, failed, refresh, save }
}
