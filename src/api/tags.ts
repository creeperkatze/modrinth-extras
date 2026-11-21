import type { Labrinth } from '@modrinth/api-client'

import { modrinthClient } from './client'

// The request cache keeps tags for an hour, so these can be called as often as needed
export function fetchGameVersionTags(): Promise<Labrinth.Tags.v2.GameVersion[]> {
	return modrinthClient.request('/tag/game_version', { api: 'labrinth', version: 2 })
}

export function fetchLoaderTags(): Promise<Labrinth.Tags.v2.Loader[]> {
	return modrinthClient.request('/tag/loader', { api: 'labrinth', version: 2 })
}

export function fetchCategoryTags(): Promise<Labrinth.Tags.v2.Category[]> {
	return modrinthClient.request('/tag/category', { api: 'labrinth', version: 2 })
}
