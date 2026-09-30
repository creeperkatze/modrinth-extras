import type { Labrinth } from '@modrinth/api-client'
import { formatVersionsForDisplay, type GameVersionTag } from '@modrinth/utils'

import { modrinthClient } from './api'

let tagsPromise: Promise<GameVersionTag[]> | null = null

export function loadGameVersionTags(): Promise<GameVersionTag[]> {
	tagsPromise ??= modrinthClient
		.request<Labrinth.Tags.v2.GameVersion[]>('/tag/game_version', { api: 'labrinth', version: 2 })
		.then((tags) => tags as GameVersionTag[])
		.catch((err) => {
			console.error('[Modrinth Extras] Failed to fetch game versions:', err)
			tagsPromise = null
			return []
		})
	return tagsPromise
}

export function formatGameVersions(raw: string, tags: GameVersionTag[]): string[] {
	const versions = raw
		.split(/[,;]\s*/)
		.map((v) => v.trim())
		.filter(Boolean)
	if (!tags.length) return versions
	return formatVersionsForDisplay(versions, tags)
}
