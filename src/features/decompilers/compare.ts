import { modrinthClient } from '../../api/client'
import { primaryJar, type Version } from './jars'
import { modsrcUrl } from './urls'

export interface VersionComparison {
	versionNumber: string
	url: string
}

export interface VersionComparisons {
	previous: VersionComparison | null
	// Every other version sharing a loader, newest first
	all: VersionComparison[]
}

interface JarVersion {
	version: Version
	fileId: string
}

function withJar(version: Version): JarVersion | null {
	const fileId = primaryJar(version)?.id
	return fileId ? { version, fileId } : null
}

function sharesAny(a: string[], b: string[]): boolean {
	return a.some((value) => b.includes(value))
}

// Older version on the left so the diff reads forward in time.
function comparison(current: JarVersion, other: JarVersion): VersionComparison {
	const [older, newer] =
		other.version.date_published < current.version.date_published
			? [other, current]
			: [current, other]
	return {
		versionNumber: other.version.version_number,
		url: modsrcUrl(current.version.project_id, older.fileId, newer.fileId),
	}
}

// Loader and game version branches are interleaved by date, so the previous version has to share them.
export async function fetchVersionComparisons(
	projectSlug: string,
	versionIdOrNumber: string,
): Promise<VersionComparisons> {
	const versions = await modrinthClient.labrinth.versions_v3.getProjectVersions(projectSlug, {
		include_changelog: false,
		apiVersion: 3,
	})
	const match =
		versions.find((v) => v.id === versionIdOrNumber) ??
		versions.find((v) => v.version_number === versionIdOrNumber)
	const current = match && withJar(match)
	if (!current) return { previous: null, all: [] }

	const { loaders, game_versions, date_published } = current.version
	const others = versions
		.filter((v) => v.id !== current.version.id && sharesAny(v.loaders, loaders))
		.sort((a, b) => b.date_published.localeCompare(a.date_published))
		.flatMap((v) => withJar(v) ?? [])
	const earlier = others.filter((o) => o.version.date_published < date_published)
	const previous =
		earlier.find((o) => sharesAny(o.version.game_versions, game_versions)) ?? earlier[0]

	return {
		previous: previous ? comparison(current, previous) : null,
		all: others.map((o) => comparison(current, o)),
	}
}
