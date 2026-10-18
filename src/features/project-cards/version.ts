import type { Labrinth } from '@modrinth/api-client'

import { chunkIdsForQuery } from '../../api/chunk-ids'
import { modrinthClient } from '../../api/client'

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
	signal?: AbortSignal
	resolve: (result: QuickDownloadResult) => void
	reject: (error: unknown) => void
}

const projects = new Map<string, Labrinth.Projects.v3.Project>()
// Versions found for cards, kept so their dependencies can be resolved on download.
export const knownVersions = new Map<string, Labrinth.Versions.v3.Version>()
const pending: DownloadRequest[] = []
let flushScheduled = false
let flushing = false

export function getQuickDownload(
	projectSlug: string,
	projectType: string,
	settings: QuickDownloadSettings,
	signal?: AbortSignal,
): Promise<QuickDownloadResult> {
	return new Promise((resolve, reject) => {
		pending.push({ projectSlug, projectType, settings, signal, resolve, reject })
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
	// Cards that left the page before their turn don't need a lookup anymore.
	const requests = pending.splice(0).filter((request) => {
		if (!request.signal?.aborted) return true
		request.reject(request.signal.reason)
		return false
	})

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

		await Promise.all(
			requests.map(async (request) => {
				try {
					const project = projects.get(request.projectSlug)
					if (!project) throw new Error(`Project not found: ${request.projectSlug}`)
					const version = await findVersion(project, request)
					request.resolve({
						projectId: project.id,
						versionId: version?.id ?? null,
						file: version ? getPrimaryFile(version) : null,
					})
				} catch (err) {
					request.reject(err)
				}
			}),
		)
	} catch (err) {
		for (const request of requests) request.reject(err)
	} finally {
		flushing = false
		if (pending.length > 0) scheduleFlush()
	}
}

// The server filters the versions, so only matching ones are downloaded instead of the full history.
async function findVersion(
	project: Labrinth.Projects.v3.Project,
	request: DownloadRequest,
): Promise<Labrinth.Versions.v3.Version | null> {
	const preferredLoader = getPreferredLoader(request.projectType, request.settings)
	const { gameVersion } = request.settings
	// Modpack versions list their pack loaders separately, so those are matched here instead.
	const checkLoaderLocally = !!preferredLoader && request.projectType === 'modpack'

	// The project lists every loader and game version it supports, so clear misses need no request.
	const projectGameVersions = project.game_versions
	if (
		gameVersion &&
		Array.isArray(projectGameVersions) &&
		!projectGameVersions.includes(gameVersion)
	) {
		return null
	}
	if (preferredLoader && !checkLoaderLocally && !project.loaders.includes(preferredLoader)) {
		return null
	}

	// Search only lists public projects, and without auth the request needs no CORS preflight.
	const candidates = await listProjectVersions(project.id, {
		loaders: preferredLoader && !checkLoaderLocally ? [preferredLoader] : [],
		gameVersions: gameVersion ? [gameVersion] : [],
		limit: checkLoaderLocally ? undefined : 1,
		skipAuth: true,
		signal: request.signal,
	})

	const version =
		candidates
			.filter((candidate) =>
				matchesPreferredLoader(candidate, request.projectType, preferredLoader),
			)
			.sort((a, b) => Date.parse(b.date_published) - Date.parse(a.date_published))[0] ?? null
	if (version) knownVersions.set(version.id, version)
	return version
}

export function listProjectVersions(
	projectId: string,
	options: {
		loaders: string[]
		gameVersions: string[]
		limit?: number
		skipAuth?: boolean
		signal?: AbortSignal
	},
): Promise<Labrinth.Versions.v3.Version[]> {
	const params: Record<string, string> = { include_changelog: 'false' }
	if (options.loaders.length > 0) params.loaders = JSON.stringify(options.loaders)
	// The v3 route ignores a top-level game_versions filter and only reads it from loader_fields.
	if (options.gameVersions.length > 0) {
		params.loader_fields = JSON.stringify({ game_versions: options.gameVersions })
	}
	if (options.limit !== undefined) params.limit = String(options.limit)

	return modrinthClient.request<Labrinth.Versions.v3.Version[]>(`/project/${projectId}/version`, {
		api: 'labrinth',
		version: 3,
		params,
		skipAuth: options.skipAuth,
		signal: options.signal,
	})
}

export function getPrimaryFile(
	version: Labrinth.Versions.v3.Version,
): Labrinth.Versions.v3.VersionFile | null {
	return version.files.find((item) => item.primary) ?? version.files[0] ?? null
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

export function getVersionLoaders(
	version: Labrinth.Versions.v3.Version,
	projectType: string,
): string[] {
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

export function getPreferredLoader(projectType: string, settings: QuickDownloadSettings): string {
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
