const API_URL = 'https://modgrade.com/api/v1/projects'

export type ModgradeSecurity = 'passed' | 'partly_checked' | 'warning' | 'malware' | 'not_checked'

export interface ModgradeProject {
	url: string
	grade: string | null
	grade_note: string | null
	security: ModgradeSecurity
	malware_platforms: string[] | null
	malware_confirmed: boolean | null
	malware_scope: 'some_files' | 'project' | null
	coverage: {
		latest_files: number
		checked: number
		code_read: number
		read_in_part: number
		cannot_check: number
		recent_versions_only: boolean
	} | null
}

export interface ModgradeResult {
	project: ModgradeProject
	malwareOnModrinth: boolean
}

// Lookups are cached by the browser for 5 minutes, so repeated visits don't count against the limit.
export async function fetchModgradeProject(projectId: string): Promise<ModgradeResult | null> {
	const res = await fetch(`${API_URL}?modrinth=${encodeURIComponent(projectId)}`)
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as { error?: string } | null
		throw new Error(body?.error ?? res.statusText)
	}
	const { results } = (await res.json()) as {
		results: {
			found: boolean
			project: ModgradeProject | null
			malware_on_this_platform: boolean | null
		}[]
	}
	const result = results[0]
	if (!result?.found || !result.project) return null
	return { project: result.project, malwareOnModrinth: result.malware_on_this_platform === true }
}
