import type { RepositoryStats } from './repository'

export async function fetchGitLabStats(repo: string): Promise<RepositoryStats> {
	const id = encodeURIComponent(repo)
	const [projectRes, mrRes, issueRes] = await Promise.all([
		fetch(`https://gitlab.com/api/v4/projects/${id}`),
		fetch(`https://gitlab.com/api/v4/projects/${id}/merge_requests?state=opened&per_page=1`),
		fetch(`https://gitlab.com/api/v4/projects/${id}/issues?state=opened&per_page=1`),
	])

	if (!projectRes.ok) {
		const body = (await projectRes.json().catch(() => null)) as { message?: string } | null
		throw new Error(body?.message ?? projectRes.statusText)
	}
	const project = (await projectRes.json()) as { star_count: number; forks_count: number }

	// GitLab omits the X-Total header once a collection exceeds 10,000 items.
	const mrTotal = mrRes.headers.get('X-Total')
	const issueTotal = issueRes.headers.get('X-Total')

	return {
		stars: project.star_count,
		forks: project.forks_count,
		prs: mrTotal ? parseInt(mrTotal) : undefined,
		issues: issueTotal ? parseInt(issueTotal) : undefined,
	}
}
