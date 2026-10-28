import type { Labrinth } from '@modrinth/api-client'

import { modrinthClient } from '../../api/client'

type Version = Labrinth.Versions.v3.Version

export interface DecompilerLinks {
	modsrc: string | null
	slicer: string
}

export interface VersionComparison {
	previousVersion: string
	url: string
}

function primaryJar(version: Version): Labrinth.Versions.v3.VersionFile | null {
	const file = version.files.find((f) => f.primary) ?? version.files[0]
	return file?.filename.toLowerCase().endsWith('.jar') ? file : null
}

function sharesAny(a: string[], b: string[]): boolean {
	return a.some((value) => b.includes(value))
}

function modsrcUrl(projectId: string, ...fileIds: string[]): string {
	return `https://modsrc.dev/1/${[projectId, ...fileIds].map(encodeURIComponent).join('/')}`
}

// Uses the given version, or the latest one when browsing the project itself.
export async function fetchDecompilerLinks(
	projectSlug: string,
	versionNumber?: string,
): Promise<DecompilerLinks | null> {
	const version = versionNumber
		? await modrinthClient.labrinth.versions_v3.getVersionFromIdOrNumber(projectSlug, versionNumber)
		: await modrinthClient.labrinth.versions_v3
				.getProjectVersions(projectSlug, { limit: 1, include_changelog: false, apiVersion: 3 })
				.then((versions) => versions[0])
	if (!version) return null

	const file = primaryJar(version)
	if (!file) return null

	return {
		modsrc: file.id ? modsrcUrl(version.project_id, file.id) : null,
		slicer: `https://slicer.run/?url=${encodeURIComponent(file.url)}`,
	}
}

// Loader and game version branches are interleaved by date, so the previous version has to share them.
export async function fetchVersionComparison(
	projectSlug: string,
	versionIdOrNumber: string,
): Promise<VersionComparison | null> {
	const versions = await modrinthClient.labrinth.versions_v3.getProjectVersions(projectSlug, {
		include_changelog: false,
		apiVersion: 3,
	})
	const current =
		versions.find((v) => v.id === versionIdOrNumber) ??
		versions.find((v) => v.version_number === versionIdOrNumber)
	const currentFile = current && primaryJar(current)
	if (!current || !currentFile?.id) return null

	const candidates = versions
		.filter(
			(v) =>
				v.date_published < current.date_published &&
				sharesAny(v.loaders, current.loaders) &&
				primaryJar(v)?.id,
		)
		.sort((a, b) => b.date_published.localeCompare(a.date_published))
	const previous =
		candidates.find((v) => sharesAny(v.game_versions, current.game_versions)) ?? candidates[0]
	const previousFileId = previous && primaryJar(previous)?.id
	if (!previous || !previousFileId) return null

	return {
		previousVersion: previous.version_number,
		url: modsrcUrl(current.project_id, previousFileId, currentFile.id),
	}
}
