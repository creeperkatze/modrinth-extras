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

export function indexProjectsById(
	projects: Labrinth.Projects.v3.Project[],
): Map<string, Labrinth.Projects.v3.Project> {
	return new Map(projects.map((project) => [project.id, project]))
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

// Uses `/project/{id}/dependencies` instead of the graph explorer's bulk `getMultiple` lookup, which silently omits some valid (e.g. unlisted) dependency projects.
async function fetchDirectDependencies(
	slugOrId: string,
	versionIdOrNumber?: string,
): Promise<EnrichedDep[]> {
	try {
		const [version, depsData] = await Promise.all([
			versionIdOrNumber
				? modrinthClient.labrinth.versions_v3.getVersionFromIdOrNumber(slugOrId, versionIdOrNumber)
				: modrinthClient.labrinth.versions_v3
						.getProjectVersions(slugOrId, { limit: 1, include_changelog: false, apiVersion: 3 })
						.then((versions) => versions[0]),
			modrinthClient.labrinth.projects_v3.getDependencies(slugOrId),
		])

		if (!version) return []
		return buildEnrichedDeps(
			normalizeDeps(version.dependencies ?? []),
			indexProjectsById(depsData.projects),
		)
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch dependencies:', err)
		return []
	}
}

export interface DependencyTree {
	roots: EnrichedDep[]
	childrenByProjectId: Map<string, EnrichedDep[]>
}

// Caps how many levels deep the tree is fetched, so it can't balloon into unbounded requests.
const MAX_DEPTH = 4

export async function fetchDependencyTree(
	projectSlug: string,
	versionNumber?: string,
): Promise<DependencyTree> {
	const roots = await fetchDirectDependencies(projectSlug, versionNumber)

	const childrenByProjectId = new Map<string, EnrichedDep[]>()
	const visited = new Set<string>()
	let frontier = roots
	let depth = 0

	while (frontier.length > 0 && depth < MAX_DEPTH) {
		const toExpand = frontier.filter((dep) => !visited.has(dep.project_id))
		for (const dep of toExpand) visited.add(dep.project_id)

		const layers = await Promise.all(
			toExpand.map(async (dep) => ({
				projectId: dep.project_id,
				children: await fetchDirectDependencies(
					dep.project?.slug ?? dep.project_id,
					dep.version_id,
				),
			})),
		)

		frontier = []
		for (const { projectId, children } of layers) {
			childrenByProjectId.set(projectId, children)
			frontier.push(...children)
		}
		depth++
	}

	return { roots, childrenByProjectId }
}
