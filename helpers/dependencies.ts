import { useBaseFetch } from '../composables/useBaseFetch'

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

export async function fetchProjectDependencies(slugOrId: string): Promise<EnrichedDep[]> {
	let versions: any[]
	try {
		versions = await useBaseFetch(`project/${slugOrId}/version?limit=1`)
	} catch {
		return []
	}

	if (!versions || versions.length === 0) return []

	const rawDeps: RawDep[] = versions[0].dependencies ?? []
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
		projects = await useBaseFetch(
			`projects?ids=${encodeURIComponent(JSON.stringify(projectIds))}`,
		)
	} catch {
		// Return deps with null project info if batch fetch fails
	}

	const projectMap = new Map(projects.map((p) => [p.id, p]))
	return relevant.map((d) => ({
		...d,
		project: projectMap.get(d.project_id) ?? null,
	}))
}
