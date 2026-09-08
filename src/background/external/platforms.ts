import type { PlatformMatch } from '../../utils/platforms'
import { findCurseForgeProject, findCurseForgeUser } from './curseforge'
import { findHangarProject, findHangarUser } from './hangar'
import { findSpigotProject, findSpigotUser } from './spigot'

// One platform being down or rate limited must not hide the others.
async function collect(
	lookups: Array<Promise<PlatformMatch | null>>,
	subject: string,
): Promise<PlatformMatch[]> {
	const results = await Promise.allSettled(lookups)

	return results.flatMap((result) => {
		if (result.status === 'rejected') {
			console.error(`[Modrinth Extras] Failed to look up ${subject} on a platform:`, result.reason)
			return []
		}
		return result.value ? [result.value] : []
	})
}

export function findPlatformProjects(title: string, slug: string): Promise<PlatformMatch[]> {
	return collect(
		[findCurseForgeProject(title, slug), findHangarProject(title, slug), findSpigotProject(title)],
		`project "${title}"`,
	)
}

export function findPlatformUsers(username: string): Promise<PlatformMatch[]> {
	return collect(
		[findCurseForgeUser(username), findHangarUser(username), findSpigotUser(username)],
		`user "${username}"`,
	)
}
