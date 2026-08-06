<template>
	<div
		v-if="repoUrl"
		class="mb-3 flex flex-col gap-3 rounded-lg border border-surface-4 bg-surface-3 p-4"
	>
		<h2 class="m-0 text-lg font-semibold text-contrast">GitHub</h2>
		<div class="flex min-w-0 max-w-full flex-col gap-3">
			<div v-if="loading" class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal">
				<LoaderCircleIcon class="mt-0.5 shrink-0 animate-spin" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['githubSidebar.loading']) }}
				</span>
			</div>
			<div
				v-else-if="error"
				class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal text-secondary"
			>
				<TriangleAlertIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['githubSidebar.loadError']) }}
				</span>
			</div>
			<template v-else-if="stats">
				<a
					:href="repoUrl + '/stargazers'"
					target="_blank"
					rel="noopener"
					class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal hover:underline"
				>
					<StarIcon aria-hidden="true" class="mt-0.5 shrink-0" />
					<span class="min-w-0 flex-1 break-words leading-tight">
						{{ formatMessage(messages['githubSidebar.stars'], { count: formatNum(stats.stars) }) }}
						<ExternalIcon
							aria-hidden="true"
							class="external-icon ml-1 inline !mb-0 align-[-0.125em]"
						/>
					</span>
				</a>
				<a
					:href="repoUrl + '/issues'"
					target="_blank"
					rel="noopener"
					class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal hover:underline"
				>
					<IssuesIcon aria-hidden="true" class="mt-0.5 shrink-0" />
					<span class="min-w-0 flex-1 break-words leading-tight">
						{{ formatMessage(messages['githubSidebar.openIssues'], { count: stats.issues }) }}
						<ExternalIcon
							aria-hidden="true"
							class="external-icon ml-1 inline !mb-0 align-[-0.125em]"
						/>
					</span>
				</a>
				<a
					:href="repoUrl + '/pulls'"
					target="_blank"
					rel="noopener"
					class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal hover:underline"
				>
					<GitPullRequestIcon aria-hidden="true" class="mt-0.5 shrink-0" />
					<span class="min-w-0 flex-1 break-words leading-tight">
						{{ formatMessage(messages['githubSidebar.openPRs'], { count: stats.prs }) }}
						<ExternalIcon
							aria-hidden="true"
							class="external-icon ml-1 inline !mb-0 align-[-0.125em]"
						/>
					</span>
				</a>
				<a
					:href="repoUrl + '/network/members'"
					target="_blank"
					rel="noopener"
					class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal hover:underline"
				>
					<GitForkIcon aria-hidden="true" class="mt-0.5 shrink-0" />
					<span class="min-w-0 flex-1 break-words leading-tight">
						{{ formatMessage(messages['githubSidebar.forks'], { count: formatNum(stats.forks) }) }}
						<ExternalIcon
							aria-hidden="true"
							class="external-icon ml-1 inline !mb-0 align-[-0.125em]"
						/>
					</span>
				</a>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import { GitForkIcon, GitPullRequestIcon } from '@lucide/vue'
import {
	ExternalIcon,
	IssuesIcon,
	LoaderCircleIcon,
	StarIcon,
	TriangleAlertIcon,
} from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'
import { browser } from 'wxt/browser'

import { modrinthClient } from '../../utils/api'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'githubSidebar.loading': { id: 'githubSidebar.loading', defaultMessage: 'Loading' },
	'githubSidebar.loadError': {
		id: 'githubSidebar.loadError',
		defaultMessage: 'Failed to load GitHub data',
	},
	'githubSidebar.stars': { id: 'githubSidebar.stars', defaultMessage: '{count} stars' },
	'githubSidebar.openIssues': {
		id: 'githubSidebar.openIssues',
		defaultMessage: '{count} open issues',
	},
	'githubSidebar.openPRs': {
		id: 'githubSidebar.openPRs',
		defaultMessage: '{count} open pull requests',
	},
	'githubSidebar.forks': { id: 'githubSidebar.forks', defaultMessage: '{count} forks' },
})

const props = defineProps<{ pageUrl: string }>()

interface GitHubStats {
	stars: number
	issues: number
	prs: number
	forks: number
}

const repoUrl = ref<string | null>(null)
const stats = ref<GitHubStats | null>(null)
const loading = ref(true)
const error = ref(false)

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

		const project = await modrinthClient.labrinth.projects_v3.get(slug)
		const sourceUrl = project.link_urls.source?.url ?? ''

		const ghMatch = sourceUrl.match(
			/^https?:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?)(?:\.git)?\/?$/,
		)
		if (!ghMatch) return

		const repo = ghMatch[1]
		repoUrl.value = `https://github.com/${repo}`

		const response = await browser.runtime.sendMessage({ type: 'github-stats', repo })
		if (!response?.ok || !response.stats) {
			error.value = true
			return
		}
		stats.value = response.stats
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load GitHub data:', err)
		error.value = true
	} finally {
		loading.value = false
	}
})
</script>
