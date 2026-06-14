import type { Labrinth } from '@modrinth/api-client'

import { modrinthClient } from '../helpers/api'

export interface RawDep {
	project_id: string
	version_id?: string
	dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded'
}

export interface EnrichedDep extends RawDep {
	project: Labrinth.Projects.v3.Project | null
}

async function enrichDeps(rawDeps: RawDep[]): Promise<EnrichedDep[]> {
	const relevant = rawDeps.filter(
		(d) =>
			(d.dependency_type === 'required' ||
				d.dependency_type === 'optional' ||
				d.dependency_type === 'embedded') &&
			d.project_id,
	)
	if (relevant.length === 0) return []

	const projectIds = [...new Set(relevant.map((d) => d.project_id))]
	let projects: Labrinth.Projects.v3.Project[] = []
	try {
		projects = await modrinthClient.labrinth.projects_v3.getMultiple(projectIds)
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch dependency project info:', err)
	}

	const projectMap = new Map(projects.map((p) => [p.id, p]))
	return relevant.map((d) => ({
		...d,
		project: projectMap.get(d.project_id) ?? null,
	}))
}

function normalizeDeps(dependencies: Labrinth.Versions.v2.Dependency[]): RawDep[] {
	return dependencies.flatMap((dependency) =>
		'project_id' in dependency && dependency.project_id
			? [
					{
						project_id: dependency.project_id,
						version_id: 'version_id' in dependency ? dependency.version_id : undefined,
						dependency_type: dependency.dependency_type,
					},
				]
			: [],
	)
}

export async function fetchProjectDependencies(slugOrId: string): Promise<EnrichedDep[]> {
	let versions: Labrinth.Versions.v2.Version[]
	try {
		versions = await modrinthClient.labrinth.versions_v2.getProjectVersions(slugOrId, {
			limit: 1,
			include_changelog: false,
		})
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch project versions for dependencies:', err)
		return []
	}

	if (!versions || versions.length === 0) return []
	return enrichDeps(normalizeDeps(versions[0].dependencies ?? []))
}

export async function fetchVersionDependencies(
	projectSlug: string,
	versionNumber: string,
): Promise<EnrichedDep[]> {
	let version: Labrinth.Versions.v2.Version
	try {
		version = await modrinthClient.labrinth.versions_v2.getVersionFromIdOrNumber(
			projectSlug,
			versionNumber,
		)
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch version for dependencies:', err)
		return []
	}

	return enrichDeps(normalizeDeps(version.dependencies ?? []))
}
