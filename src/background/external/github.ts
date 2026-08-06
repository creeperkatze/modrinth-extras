export interface GitHubStats {
	stars: number
	issues: number
	prs: number
	forks: number
}

export async function fetchGitHubStats(repo: string): Promise<GitHubStats> {
	const [repoRes, prRes] = await Promise.all([
		fetch(`https://api.github.com/repos/${repo}`),
		fetch(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=1`),
	])

	if (!repoRes.ok) {
		const body = (await repoRes.json().catch(() => null)) as { message?: string } | null
		throw new Error(body?.message ?? repoRes.statusText)
	}
	const repoData = (await repoRes.json()) as {
		stargazers_count: number
		forks_count: number
		open_issues_count: number
	}

	let prCount = 0
	if (prRes.ok) {
		const prData = (await prRes.json()) as unknown[]
		const link = prRes.headers.get('Link')
		const lastPage = link?.match(/[?&]page=(\d+)>; rel="last"/)
		prCount = lastPage ? parseInt(lastPage[1]) : prData.length
	}

	return {
		stars: repoData.stargazers_count,
		forks: repoData.forks_count,
		prs: prCount,
		issues: Math.max(0, repoData.open_issues_count - prCount),
	}
}
