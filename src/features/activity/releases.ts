import { modrinthClient } from '../../api/client'
import { DAY_MS } from '../../utils/time'

const cache = new Map<string, number[]>()

function cacheKey(projectSlug: string, days: number): string {
	return `${projectSlug}:${days}`
}

export function cachedDailyReleases(projectSlug: string, days: number): number[] | undefined {
	return cache.get(cacheKey(projectSlug, days))
}

// How many versions came out on each of the last given days, oldest first
export async function fetchDailyReleases(projectSlug: string, days: number): Promise<number[]> {
	const versions = await modrinthClient.labrinth.versions_v3.getProjectVersions(projectSlug, {
		include_changelog: false,
		apiVersion: 3,
	})
	const cutoff = Date.now() - days * DAY_MS
	const counts: number[] = Array.from({ length: days }, () => 0)
	for (const version of versions) {
		const day = Math.floor((Date.parse(version.date_published) - cutoff) / DAY_MS)
		if (day >= 0 && day < days) counts[day]!++
	}
	cache.set(cacheKey(projectSlug, days), counts)
	return counts
}
