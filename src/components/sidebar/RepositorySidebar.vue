<template>
	<div
		v-if="repoInfo"
		class="my-3 flex flex-col gap-3 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4"
	>
		<h2 class="m-0 text-lg font-semibold text-contrast">
			{{ formatMessage(messages['repositorySidebar.title']) }}
		</h2>
		<div class="flex min-w-0 max-w-full flex-col gap-3">
			<div v-if="loading" class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal">
				<LoaderCircleIcon class="mt-0.5 shrink-0 animate-spin" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['repositorySidebar.loading']) }}
				</span>
			</div>
			<div
				v-else-if="error"
				class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal text-secondary"
			>
				<TriangleAlertIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['repositorySidebar.loadError']) }}
				</span>
			</div>
			<template v-else>
				<component
					:is="row.href ? 'a' : 'div'"
					v-for="row in statRows"
					:key="row.key"
					:href="row.href"
					:target="row.href ? '_blank' : undefined"
					:rel="row.href ? 'noopener' : undefined"
					class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal"
					:class="row.href ? 'hover:underline' : ''"
				>
					<component :is="row.icon" aria-hidden="true" class="mt-0.5 shrink-0" />
					<span class="min-w-0 flex-1 break-words leading-tight">
						{{ row.text }}
						<ExternalIcon
							v-if="row.href"
							aria-hidden="true"
							class="external-icon ml-1 inline !mb-0 align-[-0.125em]"
						/>
					</span>
				</component>
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
import { computed, onMounted, ref } from 'vue'
import { browser } from 'wxt/browser'

import { modrinthClient } from '../../utils/api'
import {
	detectRepository,
	getRepositoryLinks,
	type RepositoryInfo,
} from '../../utils/repository-links'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'repositorySidebar.title': { id: 'repositorySidebar.title', defaultMessage: 'Repository' },
	'repositorySidebar.loading': { id: 'repositorySidebar.loading', defaultMessage: 'Loading' },
	'repositorySidebar.loadError': {
		id: 'repositorySidebar.loadError',
		defaultMessage: 'Failed to load repository data',
	},
	'repositorySidebar.stars': { id: 'repositorySidebar.stars', defaultMessage: '{count} stars' },
	'repositorySidebar.openIssues': {
		id: 'repositorySidebar.openIssues',
		defaultMessage: '{count} open issues',
	},
	'repositorySidebar.openPRs': {
		id: 'repositorySidebar.openPRs',
		defaultMessage: '{count} open pull requests',
	},
	'repositorySidebar.forks': { id: 'repositorySidebar.forks', defaultMessage: '{count} forks' },
})

const props = defineProps<{ pageUrl: string }>()

interface RepositoryStats {
	stars?: number
	issues?: number
	prs?: number
	forks?: number
}

const repoInfo = ref<RepositoryInfo | null>(null)
const stats = ref<RepositoryStats | null>(null)
const loading = ref(true)
const error = ref(false)

function formatNum(n: number): string {
	if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
	if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'k'
	return String(n)
}

const statRows = computed(() => {
	if (!stats.value || !repoInfo.value) return []
	const links = getRepositoryLinks(repoInfo.value.platform, repoInfo.value.repoUrl)
	const rows: { key: string; icon: unknown; text: string; href?: string }[] = []

	if (stats.value.stars !== undefined) {
		rows.push({
			key: 'stars',
			icon: StarIcon,
			text: formatMessage(messages['repositorySidebar.stars'], {
				count: formatNum(stats.value.stars),
			}),
			href: links.stars,
		})
	}
	if (stats.value.issues !== undefined) {
		rows.push({
			key: 'issues',
			icon: IssuesIcon,
			text: formatMessage(messages['repositorySidebar.openIssues'], { count: stats.value.issues }),
			href: links.issues,
		})
	}
	if (stats.value.prs !== undefined) {
		rows.push({
			key: 'prs',
			icon: GitPullRequestIcon,
			text: formatMessage(messages['repositorySidebar.openPRs'], { count: stats.value.prs }),
			href: links.prs,
		})
	}
	if (stats.value.forks !== undefined) {
		rows.push({
			key: 'forks',
			icon: GitForkIcon,
			text: formatMessage(messages['repositorySidebar.forks'], {
				count: formatNum(stats.value.forks),
			}),
			href: links.forks,
		})
	}

	return rows
})

onMounted(async () => {
	try {
		const slug = new URL(props.pageUrl).pathname.match(
			/^\/(mod|plugin|datapack|shader|resourcepack|modpack|server)\/([^/]+)/,
		)?.[2]
		if (!slug) return

		const project = await modrinthClient.labrinth.projects_v3.get(slug)
		const sourceUrl = project.link_urls.source?.url ?? ''

		const info = detectRepository(sourceUrl)
		if (!info) return
		repoInfo.value = info

		const response = await browser.runtime.sendMessage({
			type: 'repository-stats',
			platform: info.platform,
			repo: info.repo,
		})
		if (!response?.ok || !response.stats) {
			error.value = true
			return
		}
		stats.value = response.stats
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load repository data:', err)
		error.value = true
	} finally {
		loading.value = false
	}
})
</script>
