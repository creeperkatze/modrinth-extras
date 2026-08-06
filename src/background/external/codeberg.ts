import type { RepositoryStats } from './repository'

export async function fetchCodebergStats(repo: string): Promise<RepositoryStats> {
	const res = await fetch(`https://codeberg.org/api/v1/repos/${repo}`)
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as { message?: string } | null
		throw new Error(body?.message ?? res.statusText)
	}
	const data = (await res.json()) as {
		stars_count: number
		forks_count: number
		open_issues_count: number
		open_pr_counter: number
	}

	return {
		stars: data.stars_count,
		forks: data.forks_count,
		issues: data.open_issues_count,
		prs: data.open_pr_counter,
	}
}
