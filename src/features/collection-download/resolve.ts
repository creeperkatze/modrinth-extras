import type { Labrinth } from '@modrinth/api-client'

import { modrinthClient } from '../../api/client'
import { getPrimaryFile, listProjectVersions } from '../project-cards/version'
import {
	type CollectionProject,
	type ContentKind,
	fetchProjects,
	mightSupport,
	type Selection,
} from './collection'

type Version = Labrinth.Versions.v3.Version

export interface ResolvedEntry {
	project: CollectionProject
	kind: ContentKind
	versionNumber: string
	file: Labrinth.Versions.v3.VersionFile
	// Pulled in by another project rather than being part of the collection
	dependency: boolean
}

export interface Resolution {
	included: ResolvedEntry[]
}

const versions = new Map<string, Version | null>()

function loadersFor(kind: ContentKind, selection: Selection): string[] {
	if (kind === 'mod') return [selection.loader]
	if (kind === 'resourcepack') return ['minecraft']
	if (kind === 'datapack') return ['datapack']
	// Shaders are listed under the shader loader they need, any of them works
	return []
}

async function findVersion(
	project: CollectionProject,
	kind: ContentKind,
	selection: Selection,
	signal: AbortSignal,
): Promise<Version | null> {
	const loaders = loadersFor(kind, selection)
	const key = `${project.id}|${loaders.join()}|${selection.gameVersion}`
	if (versions.has(key)) return versions.get(key)!
	const [version] = await listProjectVersions(project.id, {
		loaders,
		gameVersions: [selection.gameVersion],
		limit: 1,
		signal,
	})
	versions.set(key, version ?? null)
	return version ?? null
}

async function versionById(id: string): Promise<Version | null> {
	const key = `id|${id}`
	if (versions.has(key)) return versions.get(key)!
	const version = await modrinthClient.labrinth.versions_v3.getVersion(id)
	versions.set(key, version)
	return version
}

function entry(project: CollectionProject, version: Version, dependency: boolean) {
	const file = getPrimaryFile(version)
	if (!file || !project.kind) return null
	return { project, kind: project.kind, versionNumber: version.version_number, file, dependency }
}

// Follows required dependencies of mods until none are left, skipping what is already included
async function resolveDependencies(
	roots: Version[],
	included: Set<string>,
	selection: Selection,
	signal: AbortSignal,
): Promise<Version[]> {
	const found: Version[] = []
	const seen = new Set<string>()
	let frontier = roots
	while (frontier.length > 0) {
		const dependencies = frontier
			.flatMap((version) => version.dependencies ?? [])
			.filter((dependency) => {
				const key = dependency.project_id ?? dependency.version_id
				if (dependency.dependency_type !== 'required' || !key) return false
				if (seen.has(key) || (dependency.project_id && included.has(dependency.project_id))) {
					return false
				}
				seen.add(key)
				return true
			})
		const resolved = await Promise.all(
			dependencies.map(async (dependency) => {
				try {
					if (dependency.version_id) return await versionById(dependency.version_id)
					const [version] = await listProjectVersions(dependency.project_id!, {
						loaders: [selection.loader],
						gameVersions: [selection.gameVersion],
						limit: 1,
						signal,
					})
					return version ?? null
				} catch (err) {
					if (signal.aborted) throw err
					console.error('[Modrinth Extras] Failed to resolve dependency:', err)
					return null
				}
			}),
		)
		frontier = []
		for (const version of resolved) {
			if (!version || included.has(version.project_id)) continue
			included.add(version.project_id)
			found.push(version)
			frontier.push(version)
		}
	}
	return found
}

export async function resolveCollection(
	projects: CollectionProject[],
	selection: Selection,
	withDependencies: boolean,
	signal: AbortSignal,
): Promise<Resolution> {
	const candidates = projects.filter((project) => mightSupport(project, selection))
	const found = await Promise.all(
		candidates.map(async (project) => ({
			project,
			version: await findVersion(project, project.kind!, selection, signal),
		})),
	)

	const included: ResolvedEntry[] = []
	const roots: Version[] = []
	for (const { project, version } of found) {
		const resolved = version && entry(project, version, false)
		if (!version || !resolved) continue
		included.push(resolved)
		if (resolved.kind === 'mod') roots.push(version)
	}

	if (withDependencies && roots.length > 0) {
		const ids = new Set(included.map((item) => item.project.id))
		const dependencies = await resolveDependencies(roots, ids, selection, signal)
		const dependencyProjects = await fetchProjects(dependencies.map((v) => v.project_id))
		for (const version of dependencies) {
			const project = dependencyProjects.find((candidate) => candidate.id === version.project_id)
			const resolved = project && entry(project, version, true)
			if (resolved) included.push(resolved)
		}
	}

	return { included }
}
