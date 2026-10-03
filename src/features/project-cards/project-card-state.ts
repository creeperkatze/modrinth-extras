import type { Labrinth } from '@modrinth/api-client'

import { modrinthClient } from '../../api/client'
import { chunkIdsForQuery } from '../../api/query'

export interface QuickDownloadSettings {
	modLoader: string
	pluginLoader: string
	shaderLoader: string
	gameVersion: string
	downloadDependencies: boolean
}

export interface QuickDownloadResult {
	projectId: string
	versionId: string | null
	file: Labrinth.Versions.v3.VersionFile | null
}

interface DownloadRequest {
	projectSlug: string
	projectType: string
	settings: QuickDownloadSettings
	resolve: (result: QuickDownloadResult) => void
	reject: (error: unknown) => void
}

const projects = new Map<string, Labrinth.Projects.v3.Project>()
const versions = new Map<string, Labrinth.Versions.v3.Version>()
const pending: DownloadRequest[] = []
let flushScheduled = false
let flushing = false

export function getQuickDownload(
	projectSlug: string,
	projectType: string,
	settings: QuickDownloadSettings,
): Promise<QuickDownloadResult> {
	return new Promise((resolve, reject) => {
		pending.push({ projectSlug, projectType, settings, resolve, reject })
		scheduleFlush()
	})
}

function scheduleFlush() {
	if (flushScheduled || flushing) return
	flushScheduled = true
	setTimeout(() => {
		flushScheduled = false
		void flush()
	}, 0)
}

async function flush() {
	if (flushing || pending.length === 0) return
	flushing = true
	const requests = pending.splice(0)

	try {
		const missingProjectSlugs = [
			...new Set(
				requests.map((request) => request.projectSlug).filter((slug) => !projects.has(slug)),
			),
		]

		if (missingProjectSlugs.length > 0) {
			const fetchedProjects = (
				await Promise.all(
					chunkIdsForQuery(missingProjectSlugs).map((ids) =>
						modrinthClient.labrinth.projects_v3.getMultiple(ids),
					),
				)
			).flat()
			for (const project of fetchedProjects) {
				if (project.slug) projects.set(project.slug, project)
				projects.set(project.id, project)
			}
			for (const slug of missingProjectSlugs) {
				const project = fetchedProjects.find((item) => item.slug === slug || item.id === slug)
				if (project) projects.set(slug, project)
			}
		}

		const missingVersionIds = [
			...new Set(
				requests
					.flatMap((request) => projects.get(request.projectSlug)?.versions ?? [])
					.filter((id) => !versions.has(id)),
			),
		]

		if (missingVersionIds.length > 0) {
			const fetchedVersions = (
				await Promise.all(
					chunkIdsForQuery(missingVersionIds).map((ids) =>
						modrinthClient.labrinth.versions_v3.getVersions(ids),
					),
				)
			).flat()
			for (const version of fetchedVersions) versions.set(version.id, version)
		}

		for (const request of requests) {
			const project = projects.get(request.projectSlug)
			if (!project) throw new Error(`Project not found: ${request.projectSlug}`)
			const version = findVersion(request)
			request.resolve({
				projectId: project.id,
				versionId: version?.id ?? null,
				file: version ? getPrimaryFile(version) : null,
			})
		}
	} catch (err) {
		for (const request of requests) request.reject(err)
	} finally {
		flushing = false
		if (pending.length > 0) scheduleFlush()
	}
}

function findVersion(request: DownloadRequest): Labrinth.Versions.v3.Version | null {
	const project = projects.get(request.projectSlug)
	if (!project) return null

	const preferredLoader = getPreferredLoader(request.projectType, request.settings)
	const matchingVersions = project.versions
		.map((id) => versions.get(id))
		.filter((version): version is Labrinth.Versions.v3.Version => {
			if (!version) return false
			if (!matchesPreferredLoader(version, request.projectType, preferredLoader)) return false
			if (
				request.settings.gameVersion &&
				!version.game_versions.includes(request.settings.gameVersion)
			) {
				return false
			}
			return true
		})
		.sort((a, b) => Date.parse(b.date_published) - Date.parse(a.date_published))

	return matchingVersions[0] ?? null
}

function getPrimaryFile(
	version: Labrinth.Versions.v3.Version,
): Labrinth.Versions.v3.VersionFile | null {
	return version.files.find((item) => item.primary) ?? version.files[0] ?? null
}

export async function getRequiredDependencyFiles(
	versionId: string,
	projectType: string,
	settings: QuickDownloadSettings,
): Promise<Labrinth.Versions.v3.VersionFile[]> {
	const root = versions.get(versionId)
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
			const cached = versions.get(dependency.version_id)
			if (cached) return cached
			const version = await modrinthClient.labrinth.versions_v3.getVersion(dependency.version_id)
			versions.set(version.id, version)
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

export async function saveFiles(files: Labrinth.Versions.v3.VersionFile[]) {
	const blobs = await Promise.all(
		files.map(async (file) => {
			const response = await fetch(file.url)
			if (!response.ok) throw new Error(`Failed to fetch ${file.url}: ${response.status}`)
			return { filename: file.filename, blob: await response.blob() }
		}),
	)

	// Saved as blobs since opening several download URLs in a row cancels all but the last
	for (const { filename, blob } of blobs) {
		const url = URL.createObjectURL(blob)
		const anchor = document.createElement('a')
		anchor.href = url
		anchor.download = filename
		anchor.style.display = 'none'
		document.body.appendChild(anchor)
		anchor.click()
		anchor.remove()
		setTimeout(() => URL.revokeObjectURL(url), 60_000)
	}
}

function matchesPreferredLoader(
	version: Labrinth.Versions.v3.Version,
	projectType: string,
	preferredLoader: string,
): boolean {
	if (!preferredLoader) return true
	const loaders = getVersionLoaders(version, projectType)

	if (
		projectType === 'modpack' &&
		(loaders.length === 0 || loaders.every((loader) => loader === 'mrpack'))
	) {
		return true
	}

	return loaders.includes(preferredLoader)
}

function getVersionLoaders(version: Labrinth.Versions.v3.Version, projectType: string): string[] {
	const loaders = Array.isArray(version.loaders) ? version.loaders : []

	if (projectType !== 'modpack') {
		return loaders
	}

	const mrpackLoaders = 'mrpack_loaders' in version ? version.mrpack_loaders : undefined
	if (Array.isArray(mrpackLoaders) && mrpackLoaders.length > 0) {
		return mrpackLoaders
	}

	return loaders.filter((loader) => loader !== 'mrpack')
}

function getPreferredLoader(projectType: string, settings: QuickDownloadSettings): string {
	switch (projectType) {
		case 'plugin':
			return settings.pluginLoader
		case 'shader':
			return settings.shaderLoader
		case 'mod':
		case 'modpack':
			return settings.modLoader
		case 'datapack':
		case 'resourcepack':
		default:
			return ''
	}
}
