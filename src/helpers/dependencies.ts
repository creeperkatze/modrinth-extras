import { apiFetch } from '../helpers/apiFetch'

export interface RawDep {
	project_id: string
	version_id: string | null
	dependency_type: 'required' | 'optional' | 'incompatible' | 'embedded'
}

export interface ProjectInfo {
	id: string
	slug: string
	title: string
	icon_url: string | null
	project_type: string
}

export interface EnrichedDep extends RawDep {
	project: ProjectInfo | null
}

async function enrichDeps(rawDeps: RawDep[]): Promise<EnrichedDep[]> {
	const relevant = rawDeps.filter(
		(d) =>
			(d.dependency_type === 'required' ||
				d.dependency_type === 'optional' ||
				d.dependency_type === 'embedded') &&
			d.project_id,
	)
	if (relevant.length === 0) return []

	const projectIds = [...new Set(relevant.map((d) => d.project_id))]
	let projects: ProjectInfo[] = []
	try {
		projects = (await apiFetch(
			`projects?ids=${encodeURIComponent(JSON.stringify(projectIds))}`,
		)) as ProjectInfo[]
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch dependency project info:', err)
	}

	const projectMap = new Map(projects.map((p) => [p.id, p]))
	return relevant.map((d) => ({
		...d,
		project: projectMap.get(d.project_id) ?? null,
	}))
}

export async function fetchProjectDependencies(slugOrId: string): Promise<EnrichedDep[]> {
	let versions: { dependencies?: RawDep[] }[]
	try {
		versions = (await apiFetch(`project/${slugOrId}/version?limit=1`)) as {
			dependencies?: RawDep[]
		}[]
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch project versions for dependencies:', err)
		return []
	}

	if (!versions || versions.length === 0) return []
	return enrichDeps(versions[0].dependencies ?? [])
}

export async function fetchVersionDependencies(
	projectSlug: string,
	versionNumber: string,
): Promise<EnrichedDep[]> {
	let version: { dependencies?: RawDep[] }
	try {
		version = (await apiFetch(
			`project/${projectSlug}/version/${encodeURIComponent(versionNumber)}`,
		)) as { dependencies?: RawDep[] }
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch version for dependencies:', err)
		return []
	}

	return enrichDeps(version.dependencies ?? [])
}
