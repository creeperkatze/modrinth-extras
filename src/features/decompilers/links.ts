import { modrinthClient } from '../../api/client'
import { primaryJar } from './jars'
import { modsrcUrl, slicerUrl } from './urls'

export interface DecompilerLinks {
	modsrc: string | null
	slicer: string
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
		slicer: slicerUrl(file.url),
	}
}
