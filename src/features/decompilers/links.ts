import { modrinthClient } from '../../api/client'

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

	const file = version.files.find((f) => f.primary) ?? version.files[0]
	if (!file?.filename.toLowerCase().endsWith('.jar')) return null

	return {
		modsrc: file.id
			? `https://modsrc.dev/1/${encodeURIComponent(version.project_id)}/${encodeURIComponent(file.id)}`
			: null,
		slicer: `https://slicer.run/?url=${encodeURIComponent(file.url)}`,
	}
}
