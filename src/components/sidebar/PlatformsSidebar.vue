<template>
	<div
		v-if="subject && (loading || error || matches.length > 0)"
		class="my-3 flex flex-col gap-3 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4"
	>
		<h2 class="m-0 text-lg font-semibold text-contrast">
			{{ formatMessage(messages['platformsSidebar.title']) }}
		</h2>
		<div class="flex min-w-0 max-w-full flex-col gap-3">
			<div v-if="loading" class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal">
				<LoaderCircleIcon class="mt-0.5 shrink-0 animate-spin" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['platformsSidebar.loading']) }}
				</span>
			</div>
			<div
				v-else-if="error"
				class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal text-secondary"
			>
				<TriangleAlertIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['platformsSidebar.loadError']) }}
				</span>
			</div>
			<div
				v-for="match in matches"
				v-else
				:key="match.platform"
				class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal"
			>
				<a
					:href="match.url"
					:title="match.name"
					target="_blank"
					rel="noopener"
					class="flex min-w-0 flex-1 items-start gap-2 hover:underline"
				>
					<component
						:is="PLATFORM_ICONS[match.platform]"
						aria-hidden="true"
						class="mt-0.5 shrink-0"
					/>
					<span class="min-w-0 flex-1 break-words leading-tight">
						{{ PLATFORM_LABELS[match.platform] }}
						<ExternalIcon
							aria-hidden="true"
							class="external-icon ml-1 inline !mb-0 align-[-0.125em]"
						/>
					</span>
				</a>
				<span
					v-if="match.downloads !== undefined"
					:aria-label="
						formatMessage(messages['platformsSidebar.downloads'], {
							count: formatCompact(match.downloads),
						})
					"
					class="mt-0.5 flex shrink-0 items-center gap-1 leading-tight text-secondary"
				>
					<DownloadIcon aria-hidden="true" class="shrink-0" />
					{{ formatCompact(match.downloads) }}
				</span>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { DownloadIcon, ExternalIcon, LoaderCircleIcon, TriangleAlertIcon } from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'
import { browser } from 'wxt/browser'

import CurseForgeIcon from '../../assets/platforms/curseforge.svg?component'
import HangarIcon from '../../assets/platforms/hangar.svg?component'
import SpigotIcon from '../../assets/platforms/spigot.svg?component'
import { modrinthClient } from '../../utils/api'
import { type Platform, PLATFORM_LABELS, type PlatformMatch } from '../../utils/platforms'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'platformsSidebar.title': {
		id: 'platformsSidebar.title',
		defaultMessage: 'Other platforms',
	},
	'platformsSidebar.loading': { id: 'platformsSidebar.loading', defaultMessage: 'Loading' },
	'platformsSidebar.loadError': {
		id: 'platformsSidebar.loadError',
		defaultMessage: 'Failed to load other platforms',
	},
	'platformsSidebar.downloads': {
		id: 'platformsSidebar.downloads',
		defaultMessage: '{count} downloads',
	},
})

const PLATFORM_ICONS = {
	curseforge: CurseForgeIcon,
	hangar: HangarIcon,
	spigot: SpigotIcon,
} satisfies Record<Platform, unknown>

const PROJECT_PATTERN = /^\/(?:mod|plugin|datapack|shader|resourcepack|modpack|server)\/([^/]+)/
const USER_PATTERN = /^\/(?:user|organization)\/([^/]+)/

const props = defineProps<{ pageUrl: string }>()

const path = new URL(props.pageUrl).pathname
const projectSlug = path.match(PROJECT_PATTERN)?.[1]
const username = path.match(USER_PATTERN)?.[1]
const subject = projectSlug ?? username

const matches = ref<PlatformMatch[]>([])
const loading = ref(true)
const error = ref(false)

const compactFormatter = new Intl.NumberFormat(undefined, {
	notation: 'compact',
	maximumFractionDigits: 1,
})

function formatCompact(value: number): string {
	return compactFormatter.format(value)
}

onMounted(async () => {
	try {
		if (!subject) return

		// Matching is name-based, so a project needs its Modrinth title resolved first.
		const request = projectSlug
			? {
					type: 'platform-matches',
					kind: 'project',
					title: (await modrinthClient.labrinth.projects_v3.get(projectSlug)).name,
					slug: projectSlug,
				}
			: { type: 'platform-matches', kind: 'user', username }

		const response = await browser.runtime.sendMessage(request)
		if (!response?.ok) {
			error.value = true
			return
		}
		matches.value = response.matches as PlatformMatch[]
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load other platforms:', err)
		error.value = true
	} finally {
		loading.value = false
	}
})
</script>
