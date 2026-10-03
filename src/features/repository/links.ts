export type RepositoryPlatform = 'github' | 'gitlab' | 'codeberg' | 'bitbucket'

export interface RepositoryInfo {
	platform: RepositoryPlatform
	repo: string
	repoUrl: string
}

const HOSTS: Record<RepositoryPlatform, string> = {
	github: 'github.com',
	gitlab: 'gitlab.com',
	codeberg: 'codeberg.org',
	bitbucket: 'bitbucket.org',
}

const SEGMENT = /^[A-Za-z0-9_.-]+$/

// Source URLs often point at a branch/file view rather than the repo root, so only the leading path segments are used.
export function detectRepository(sourceUrl: string): RepositoryInfo | null {
	let url: URL
	try {
		url = new URL(sourceUrl)
	} catch {
		return null
	}

	const host = url.hostname.replace(/^www\./, '')
	const platform = (Object.keys(HOSTS) as RepositoryPlatform[]).find((p) => HOSTS[p] === host)
	if (!platform) return null

	const segments = url.pathname.split('/').filter(Boolean)

	// GitLab nests subgroups (owner/subgroup/.../repo) up to the literal "/-/" that starts a specific view.
	let pathSegments = segments
	if (platform === 'gitlab') {
		const dashIndex = segments.indexOf('-')
		if (dashIndex !== -1) pathSegments = segments.slice(0, dashIndex)
	} else {
		pathSegments = segments.slice(0, 2)
	}

	if (pathSegments.length < 2 || !pathSegments.every((s) => SEGMENT.test(s))) return null
	const repo = pathSegments.join('/').replace(/\.git$/, '')

	return { platform, repo, repoUrl: `https://${host}/${repo}` }
}

export interface RepositoryLinks {
	stars?: string
	issues?: string
	prs?: string
	forks?: string
}

export function getRepositoryLinks(platform: RepositoryPlatform, repoUrl: string): RepositoryLinks {
	switch (platform) {
		case 'github':
			return {
				stars: `${repoUrl}/stargazers`,
				issues: `${repoUrl}/issues`,
				prs: `${repoUrl}/pulls`,
				forks: `${repoUrl}/network/members`,
			}
		case 'gitlab':
			return {
				stars: `${repoUrl}/-/starrers`,
				issues: `${repoUrl}/-/issues`,
				prs: `${repoUrl}/-/merge_requests`,
				forks: `${repoUrl}/-/forks`,
			}
		case 'codeberg':
			return {
				stars: `${repoUrl}/stars`,
				issues: `${repoUrl}/issues`,
				prs: `${repoUrl}/pulls`,
				forks: `${repoUrl}/forks`,
			}
		case 'bitbucket':
			// Bitbucket Cloud has no stars concept and no dedicated forks-list page.
			return {
				issues: `${repoUrl}/issues`,
				prs: `${repoUrl}/pull-requests/`,
			}
	}
}
