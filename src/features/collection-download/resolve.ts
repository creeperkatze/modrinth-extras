import type { Labrinth } from '@modrinth/api-client'

import { modrinthClient } from '../../api/client'
import { isRateLimited, RATE_LIMIT_PAUSE_MS } from '../../api/features/throttle'
import { getPrimaryFile, listProjectVersions } from '../quick-actions/version'
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
	dependency: boolean
}

export interface Resolution {
	included: ResolvedEntry[]
}

export type ResolveProgress = (done: number, total: number) => void

// Every project needs its own lookup, so large collections are spread out to stay under the
// rate limit that Modrinth's own site shares with the extension
const REQUESTS_PER_SECOND = 4
const MAX_RETRIES = 3

const versions = new Map<string, Version | null>()
let nextSlot = 0

function sleep(ms: number, signal: AbortSignal): Promise<void> {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(resolve, ms)
		signal.addEventListener(
			'abort',
			() => {
				clearTimeout(timer)
				reject(signal.reason)
			},
			{ once: true },
		)
	})
}

// Waits for the next free slot, then retries once the throttle's pause after a 429 is over
async function paced<T>(request: () => Promise<T>, signal: AbortSignal): Promise<T> {
	for (let attempt = 0; ; attempt++) {
		const now = Date.now()
		const slot = Math.max(now, nextSlot)
		nextSlot = slot + 1000 / REQUESTS_PER_SECOND
		if (slot > now) await sleep(slot - now, signal)
		signal.throwIfAborted()
		try {
			return await request()
		} catch (err) {
			if (signal.aborted || attempt >= MAX_RETRIES || !isRateLimited(err)) throw err
			await sleep(RATE_LIMIT_PAUSE_MS, signal)
		}
	}
}

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
	const [version] = await paced(
		() =>
			listProjectVersions(project.id, {
				loaders,
				gameVersions: [selection.gameVersion],
				limit: 1,
				skipAuth: project.public,
				signal,
			}),
		signal,
	)
	versions.set(key, version ?? null)
	return version ?? null
}

async function versionById(id: string, signal: AbortSignal): Promise<Version | null> {
	const key = `id|${id}`
	if (versions.has(key)) return versions.get(key)!
	const version = await paced(() => modrinthClient.labrinth.versions_v3.getVersion(id), signal)
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
					if (dependency.version_id) return await versionById(dependency.version_id, signal)
					const [version] = await paced(
						() =>
							listProjectVersions(dependency.project_id!, {
								loaders: [selection.loader],
								gameVersions: [selection.gameVersion],
								limit: 1,
								// Mods can only depend on public projects
								skipAuth: true,
								signal,
							}),
						signal,
					)
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
	onProgress?: ResolveProgress,
): Promise<Resolution> {
	// The run before was cancelled, so the slots it reserved are free again
	nextSlot = 0
	const candidates = projects.filter((project) => mightSupport(project, selection))
	let done = 0
	onProgress?.(done, candidates.length)
	// A failed lookup only leaves out its own project
	const found = await Promise.all(
		candidates.map(async (project) => {
			let version: Version | null = null
			try {
				version = await findVersion(project, project.kind!, selection, signal)
			} catch (err) {
				if (signal.aborted) throw err
				console.error(`[Modrinth Extras] Failed to find a version of ${project.slug}:`, err)
			}
			onProgress?.(++done, candidates.length)
			return { project, version }
		}),
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
