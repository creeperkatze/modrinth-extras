import type { Labrinth } from '@modrinth/api-client'

import { modrinthClient } from './api'

export interface QuickDownloadSettings {
	modLoader: string
	pluginLoader: string
	shaderLoader: string
	gameVersion: string
}

interface DownloadRequest {
	projectSlug: string
	projectType: string
	settings: QuickDownloadSettings
	resolve: (url: string | null) => void
	reject: (error: unknown) => void
}

const projects = new Map<string, Labrinth.Projects.v3.Project>()
const versions = new Map<string, Labrinth.Versions.v2.Version>()
const pending: DownloadRequest[] = []
let flushScheduled = false
let flushing = false

export function getQuickDownloadUrl(
	projectSlug: string,
	projectType: string,
	settings: QuickDownloadSettings,
): Promise<string | null> {
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
			const fetchedProjects =
				await modrinthClient.labrinth.projects_v3.getMultiple(missingProjectSlugs)
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
			const fetchedVersions =
				await modrinthClient.labrinth.versions_v2.getVersions(missingVersionIds)
			for (const version of fetchedVersions) versions.set(version.id, version)
		}

		for (const request of requests) request.resolve(findDownloadUrl(request))
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
		.filter((version): version is Labrinth.Versions.v2.Version => {
			if (!version) return false
			if (preferredLoader && !version.loaders.includes(preferredLoader)) return false
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
