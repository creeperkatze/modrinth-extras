<template>
	<div v-if="stats && repoUrl" class="card flex-card experimental-styles-within">
		<h2>GitHub</h2>
		<div class="details-list">
			<a
				:href="repoUrl + '/stargazers'"
				target="_blank"
				rel="noopener"
				class="details-list__item hover:underline"
			>
				<StarIcon aria-hidden="true" />
				{{ formatNum(stats.stars) }} stars
				<ExternalIcon aria-hidden="true" class="external-icon" />
			</a>
			<a
				:href="repoUrl + '/issues'"
				target="_blank"
				rel="noopener"
				class="details-list__item hover:underline"
			>
				<IssuesIcon aria-hidden="true" />
				{{ stats.issues }} open issues
				<ExternalIcon aria-hidden="true" class="external-icon" />
			</a>
			<a
				:href="repoUrl + '/pulls'"
				target="_blank"
				rel="noopener"
				class="details-list__item hover:underline"
			>
				<!-- lucide git-pull-request -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					fill="none"
					stroke="currentColor"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<circle cx="18" cy="18" r="3" />
					<circle cx="6" cy="6" r="3" />
					<path d="M13 6h3a2 2 0 0 1 2 2v7" />
					<line x1="6" y1="9" x2="6" y2="21" />
				</svg>
				{{ stats.prs }} open pull requests
				<ExternalIcon aria-hidden="true" class="external-icon" />
			</a>
			<a
				:href="repoUrl + '/network/members'"
				target="_blank"
				rel="noopener"
				class="details-list__item hover:underline"
			>
				<!-- lucide git-fork -->
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					fill="none"
					stroke="currentColor"
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					viewBox="0 0 24 24"
					aria-hidden="true"
				>
					<circle cx="12" cy="18" r="3" />
					<circle cx="6" cy="6" r="3" />
					<circle cx="18" cy="6" r="3" />
					<path d="M6 9v2a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9" />
					<line x1="12" y1="12" x2="12" y2="15" />
				</svg>
				{{ formatNum(stats.forks) }} forks
				<ExternalIcon aria-hidden="true" class="external-icon" />
			</a>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ExternalIcon, IssuesIcon, StarIcon } from '@modrinth/assets'
import { onMounted, ref } from 'vue'

import { apiFetch } from '../helpers/apiFetch'

const props = defineProps<{ pageUrl: string }>()

interface GitHubStats {
	stars: number
	issues: number
	prs: number
	forks: number
}

const repoUrl = ref<string | null>(null)
const stats = ref<GitHubStats | null>(null)

function formatNum(n: number): string {
	if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
	if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
	return String(n)
}

onMounted(async () => {
	try {
		const slug = new URL(props.pageUrl).pathname.match(
			/^\/(mod|plugin|datapack|shader|resourcepack|modpack|server)\/([^/]+)/,
		)?.[2]
		if (!slug) return

		const project = (await apiFetch(`project/${slug}`)) as Record<string, unknown>
		const sourceUrl = (project?.source_url as string) ?? ''

		const ghMatch = sourceUrl.match(
			/^https?:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?\/?$/,
		)
		if (!ghMatch) return

		const repo = ghMatch[1]
		repoUrl.value = `https://github.com/${repo}`

		const [repoRes, prRes] = await Promise.all([
			fetch(`https://api.github.com/repos/${repo}`),
			fetch(`https://api.github.com/repos/${repo}/pulls?state=open&per_page=1`),
		])

		if (!repoRes.ok) return
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

		stats.value = {
			stars: repoData.stargazers_count,
			forks: repoData.forks_count,
			prs: prCount,
			issues: Math.max(0, repoData.open_issues_count - prCount),
		}
	} catch {
		// silently ignore — card simply won't render
	}
})
</script>
