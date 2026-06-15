import type { Labrinth } from '@modrinth/api-client'

import { modrinthClient } from './api'

export interface QuickDownloadSettings {
	modLoader: string
	pluginLoader: string
	shaderLoader: string
	gameVersion: string
}

export interface QuickDownloadResult {
	projectId: string
	downloadUrl: string | null
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
const MAX_ENCODED_IDS_LENGTH = 6_000
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
			request.resolve({
				projectId: project.id,
				downloadUrl: findDownloadUrl(request),
			})
		}
	} catch (err) {
		for (const request of requests) request.reject(err)
	} finally {
		flushing = false
		if (pending.length > 0) scheduleFlush()
	}
}

function findDownloadUrl(request: DownloadRequest): string | null {
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

	const file =
		matchingVersions[0]?.files.find((item) => item.primary) ?? matchingVersions[0]?.files[0]
	return file?.url ?? null
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

function chunkIdsForQuery(ids: string[]): string[][] {
	const chunks: string[][] = []
	let chunk: string[] = []
	let encodedLength = 6 // Encoded JSON brackets: %5B and %5D

	for (const id of ids) {
		const idLength = encodeURIComponent(JSON.stringify(id)).length
		const separatorLength = chunk.length > 0 ? 3 : 0 // Encoded comma: %2C
		if (chunk.length > 0 && encodedLength + separatorLength + idLength > MAX_ENCODED_IDS_LENGTH) {
			chunks.push(chunk)
			chunk = []
			encodedLength = 6
		}
		chunk.push(id)
		encodedLength += (chunk.length > 1 ? 3 : 0) + idLength
	}

	if (chunk.length > 0) chunks.push(chunk)
	return chunks
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
