import type { RepositoryStats } from './repository'

// Bitbucket Cloud has no stars concept, so RepositoryStats.stars is left undefined here.
export async function fetchBitbucketStats(repo: string): Promise<RepositoryStats> {
	const base = `https://api.bitbucket.org/2.0/repositories/${repo}`

	const [repoRes, forksRes, prsRes] = await Promise.all([
		fetch(`${base}?fields=has_issues`),
		fetch(`${base}/forks?pagelen=1&fields=size`),
		fetch(`${base}/pullrequests?state=OPEN&pagelen=1&fields=size`),
	])

	if (!repoRes.ok) {
		const body = (await repoRes.json().catch(() => null)) as { error?: { message?: string } } | null
		throw new Error(body?.error?.message ?? repoRes.statusText)
	}
	const repoData = (await repoRes.json()) as { has_issues: boolean }
	const forksData = forksRes.ok ? ((await forksRes.json()) as { size?: number }) : {}
	const prsData = prsRes.ok ? ((await prsRes.json()) as { size?: number }) : {}

	let issues: number | undefined
	if (repoData.has_issues) {
		const issuesRes = await fetch(
			`${base}/issues?pagelen=1&fields=size&q=${encodeURIComponent('state="new" or state="open"')}`,
		)
		if (issuesRes.ok) {
			issues = ((await issuesRes.json()) as { size?: number }).size
		}
	}

	return {
		forks: forksData.size,
		prs: prsData.size,
		issues,
	}
}
