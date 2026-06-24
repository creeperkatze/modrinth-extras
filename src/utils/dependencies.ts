import type { Labrinth } from '@modrinth/api-client'

import { modrinthClient } from './api'

export interface RawDep {
	project_id: string
	version_id?: string
	dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded'
}

export interface EnrichedDep extends RawDep {
	project: Labrinth.Projects.v3.Project | null
}

function normalizeDeps(dependencies: Labrinth.Versions.v3.Dependency[]): RawDep[] {
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

function buildEnrichedDeps(
	rawDeps: RawDep[],
	projects: Labrinth.Projects.v3.Project[],
): EnrichedDep[] {
	const relevant = rawDeps.filter(
		(d) =>
			(d.dependency_type === 'required' ||
				d.dependency_type === 'optional' ||
				d.dependency_type === 'embedded') &&
			d.project_id,
	)
	const projectMap = new Map(projects.map((p) => [p.id, p]))
	return relevant.map((d) => ({
		...d,
		project: projectMap.get(d.project_id) ?? null,
	}))
}

export async function fetchProjectDependencies(slugOrId: string): Promise<EnrichedDep[]> {
	try {
		const [versions, depsData] = await Promise.all([
			modrinthClient.labrinth.versions_v3.getProjectVersions(slugOrId, {
				limit: 1,
				include_changelog: false,
				apiVersion: 3,
			}),
			modrinthClient.labrinth.projects_v3.getDependencies(slugOrId),
		])

		if (!versions || versions.length === 0) return []
		return buildEnrichedDeps(normalizeDeps(versions[0].dependencies ?? []), depsData.projects)
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch project dependencies:', err)
		return []
	}
}

export async function fetchVersionDependencies(
	projectSlug: string,
	versionNumber: string,
): Promise<EnrichedDep[]> {
	try {
		const [version, depsData] = await Promise.all([
			modrinthClient.labrinth.versions_v3.getVersionFromIdOrNumber(projectSlug, versionNumber),
			modrinthClient.labrinth.projects_v3.getDependencies(projectSlug),
		])

		return buildEnrichedDeps(normalizeDeps(version.dependencies ?? []), depsData.projects)
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch version dependencies:', err)
		return []
	}
}
