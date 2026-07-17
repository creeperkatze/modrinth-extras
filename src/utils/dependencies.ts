import type { Labrinth } from '@modrinth/api-client'

import { modrinthClient } from './api'
import { chunkIdsForQuery } from './query'

export interface RawDep {
	project_id: string
	version_id?: string
	dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded'
}

export interface EnrichedDep extends RawDep {
	project: Labrinth.Projects.v3.Project | null
}

export function isGraphDependency(dependency: RawDep): boolean {
	return (
		dependency.dependency_type === 'required' ||
		dependency.dependency_type === 'optional' ||
		dependency.dependency_type === 'embedded'
	)
}

export function normalizeDeps(dependencies: Labrinth.Versions.v3.Dependency[]): RawDep[] {
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

export function buildEnrichedDeps(
	rawDeps: RawDep[],
	projectsById: ReadonlyMap<string, Labrinth.Projects.v3.Project>,
): EnrichedDep[] {
	return rawDeps.filter(isGraphDependency).map((d) => ({
		...d,
		project: projectsById.get(d.project_id) ?? null,
	}))
}

function projectsById(
	projects: Labrinth.Projects.v3.Project[],
): Map<string, Labrinth.Projects.v3.Project> {
	return new Map(projects.map((p) => [p.id, p]))
}

export async function fetchDependencyGraphRoot(
	projectSlug: string,
	versionNumber?: string,
): Promise<{ project: Labrinth.Projects.v3.Project; dependencies: RawDep[] }> {
	const [project, version] = await Promise.all([
		modrinthClient.labrinth.projects_v3.get(projectSlug),
		versionNumber
			? modrinthClient.labrinth.versions_v3.getVersionFromIdOrNumber(projectSlug, versionNumber)
			: modrinthClient.labrinth.versions_v3
					.getProjectVersions(projectSlug, { limit: 1, include_changelog: false, apiVersion: 3 })
					.then((versions) => versions[0]),
	])

	return { project, dependencies: normalizeDeps(version?.dependencies ?? []) }
}

export async function fetchDependencyGraphLayer(dependencies: RawDep[]): Promise<{
	projects: Labrinth.Projects.v3.Project[]
	dependenciesByProjectId: Map<string, RawDep[]>
}> {
	if (dependencies.length === 0) return { projects: [], dependenciesByProjectId: new Map() }

	const projects = await fetchProjects([
		...new Set(dependencies.map((dependency) => dependency.project_id)),
	])
	const versionIdsByProjectId = new Map<string, string>()
	for (const dependency of dependencies) {
		if (dependency.version_id && !versionIdsByProjectId.has(dependency.project_id)) {
			versionIdsByProjectId.set(dependency.project_id, dependency.version_id)
		}
	}
	const versions = await fetchVersions(
		projects.flatMap((project) => {
			const versionId = versionIdsByProjectId.get(project.id) ?? project.versions[0]
			return versionId ? [versionId] : []
		}),
	)
	const versionsByProjectId = new Map(versions.map((version) => [version.project_id, version]))

	return {
		projects,
		dependenciesByProjectId: new Map(
			projects.map((project) => [
				project.id,
				normalizeDeps(versionsByProjectId.get(project.id)?.dependencies ?? []),
			]),
		),
	}
}

async function fetchProjects(ids: string[]): Promise<Labrinth.Projects.v3.Project[]> {
	const projects: Labrinth.Projects.v3.Project[] = []
	for (const batch of chunkIdsForQuery(ids)) {
		projects.push(...(await modrinthClient.labrinth.projects_v3.getMultiple(batch)))
	}
	return projects
}

async function fetchVersions(ids: string[]): Promise<Labrinth.Versions.v3.Version[]> {
	const versions: Labrinth.Versions.v3.Version[] = []
	for (const batch of chunkIdsForQuery([...new Set(ids)])) {
		versions.push(...(await modrinthClient.labrinth.versions_v3.getVersions(batch)))
	}
	return versions
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
		return buildEnrichedDeps(
			normalizeDeps(versions[0].dependencies ?? []),
			projectsById(depsData.projects),
		)
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

		return buildEnrichedDeps(
			normalizeDeps(version.dependencies ?? []),
			projectsById(depsData.projects),
		)
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch version dependencies:', err)
		return []
	}
}
