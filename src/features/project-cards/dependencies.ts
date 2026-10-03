import type { Labrinth } from '@modrinth/api-client'

import { modrinthClient } from '../../api/client'
import {
	getPreferredLoader,
	getPrimaryFile,
	getVersionLoaders,
	knownVersions,
	type QuickDownloadSettings,
} from './version'

export async function getRequiredDependencyFiles(
	versionId: string,
	projectType: string,
	settings: QuickDownloadSettings,
): Promise<Labrinth.Versions.v3.VersionFile[]> {
	const root = knownVersions.get(versionId)
	// Modpacks already bundle their own dependencies
	if (!root || projectType === 'modpack') return []

	const preferredLoader = getPreferredLoader(projectType, settings)
	const loaders = preferredLoader ? [preferredLoader] : getVersionLoaders(root, projectType)
	const gameVersions = settings.gameVersion ? [settings.gameVersion] : root.game_versions

	const seenProjectIds = new Set([root.project_id])
	const seenDependencyKeys = new Set<string>()
	const files: Labrinth.Versions.v3.VersionFile[] = []
	let frontier = [root]

	while (frontier.length > 0) {
		const dependencies = frontier
			.flatMap((version) => version.dependencies ?? [])
			.filter((dependency) => {
				if (dependency.dependency_type !== 'required') return false
				if (dependency.project_id && seenProjectIds.has(dependency.project_id)) return false
				const key = dependency.version_id ?? dependency.project_id
				if (!key || seenDependencyKeys.has(key)) return false
				seenDependencyKeys.add(key)
				return true
			})

		const resolved = await Promise.all(
			dependencies.map((dependency) => resolveDependencyVersion(dependency, loaders, gameVersions)),
		)

		frontier = []
		for (const version of resolved) {
			if (!version || seenProjectIds.has(version.project_id)) continue
			seenProjectIds.add(version.project_id)
			frontier.push(version)
			const file = getPrimaryFile(version)
			if (file) files.push(file)
		}
	}

	return files
}

async function resolveDependencyVersion(
	dependency: Labrinth.Versions.v3.Dependency,
	loaders: string[],
	gameVersions: string[],
): Promise<Labrinth.Versions.v3.Version | null> {
	try {
		if (dependency.version_id) {
			const cached = knownVersions.get(dependency.version_id)
			if (cached) return cached
			const version = await modrinthClient.labrinth.versions_v3.getVersion(dependency.version_id)
			knownVersions.set(version.id, version)
			return version
		}

		if (!dependency.project_id) return null
		const [version] = await modrinthClient.labrinth.versions_v3.getProjectVersions(
			dependency.project_id,
			{
				loaders,
				game_versions: gameVersions,
				include_changelog: false,
				limit: 1,
				apiVersion: 3,
			},
		)
		return version ?? null
	} catch (err) {
		console.error('[Modrinth Extras] Failed to resolve dependency:', err)
		return null
	}
}
