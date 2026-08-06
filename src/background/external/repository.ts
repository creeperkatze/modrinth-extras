import type { RepositoryPlatform } from '../../utils/repository-links'
import { fetchBitbucketStats } from './bitbucket'
import { fetchCodebergStats } from './codeberg'
import { fetchGitHubStats } from './github'
import { fetchGitLabStats } from './gitlab'

export interface RepositoryStats {
	stars?: number
	issues?: number
	prs?: number
	forks?: number
}

export function fetchRepositoryStats(
	platform: RepositoryPlatform,
	repo: string,
): Promise<RepositoryStats> {
	switch (platform) {
		case 'github':
			return fetchGitHubStats(repo)
		case 'gitlab':
			return fetchGitLabStats(repo)
		case 'codeberg':
			return fetchCodebergStats(repo)
		case 'bitbucket':
			return fetchBitbucketStats(repo)
	}
}
