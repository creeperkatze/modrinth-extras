<template>
	<div class="flex h-[500px] w-[360px] flex-col">
		<header class="flex shrink-0 items-center gap-3 px-4 py-3.5">
			<a
				href="https://github.com/creeperkatze/modrinth-extras"
				target="_blank"
				rel="noopener"
				class="flex min-w-0 flex-1 items-center gap-3 no-underline"
			>
				<img
					:src="browser.runtime.getURL('icon-48.png')"
					alt=""
					class="size-9 shrink-0 rounded-lg"
					aria-hidden="true"
				/>
				<div class="flex flex-col gap-0.5">
					<span class="font-semibold text-contrast">Modrinth Extras</span>
					<span class="text-xs text-secondary">by Creeperkatze</span>
				</div>
			</a>
			<ButtonStyled color="brand" size="standard">
				<a href="https://modrinth.com" target="_blank" rel="noopener" class="no-underline">
					Modrinth
					<ArrowUpRightIcon aria-hidden="true" />
				</a>
			</ButtonStyled>
		</header>

		<HorizontalRule class="shrink-0" />

		<div class="min-h-0 flex-1 overflow-y-auto">
			<div class="flex flex-col gap-3 px-4 py-3">
				<p class="m-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-secondary">
					Extension
				</p>
				<ToggleRow
					id="toggle-badge"
					v-model="settings.showBadge"
					title="Notification count on icon"
					description="Display unread notification count as a badge on the extension icon."
				/>
			</div>

			<HorizontalRule />

			<div class="flex flex-col gap-3 px-4 py-3">
				<p class="m-0 text-[11px] font-semibold uppercase tracking-[0.06em] text-secondary">
					Extras
				</p>
				<ToggleRow
					id="toggle-notifications"
					v-model="settings.showNotificationsIndicator"
					title="Notifications indicator"
					description="Adds a notification indicator to the header. Clicking it opens a popout where you can view and manage your notifications."
				/>
				<ToggleRow
					id="toggle-tools"
					v-model="settings.showToolsSidebar"
					title="Tools sidebar"
					description="Adds a tools card to the sidebar on project, user, organization, and collection pages."
				/>
				<ToggleRow
					id="toggle-deps"
					v-model="settings.showDependenciesSidebar"
					title="Dependency sidebar"
					description="Shows a collapsible dependency tree sidebar on project pages."
				/>
				<ToggleRow
					id="toggle-sparkline"
					v-model="settings.showActivitySparkline"
					title="Activity sparkline"
					description="Shows a sparkline graph of version publishing activity over the last two months on project pages."
				/>
				<ToggleRow
					id="toggle-github"
					v-model="settings.showGitHubSidebar"
					title="GitHub sidebar"
					description="Shows a GitHub card in the sidebar with stars, open issues, pull requests, and forks for projects with a GitHub source."
				/>
				<ToggleRow
					id="toggle-quick-search"
					v-model="settings.showQuickSearch"
					title="Quick search"
					description="Opens a search modal with faceted filtering when pressing Ctrl+K or / anywhere on Modrinth."
				/>
			</div>
		</div>

		<HorizontalRule class="shrink-0" />

		<div class="flex shrink-0 items-center gap-1 px-4 py-2">
			<span class="text-xs text-secondary">v{{ version }}</span>
			<span v-if="checking" class="flex items-center gap-1 text-xs text-secondary">
				<LoaderCircleIcon class="size-4 animate-spin" aria-hidden="true" />
				Checking
			</span>
			<a
				v-else-if="isLatest"
				href="https://github.com/creeperkatze/modrinth-extras/releases/latest"
				target="_blank"
				rel="noopener"
				class="flex items-center text-xs gap-1 text-brand no-underline"
			>
				<CheckCircleIcon class="size-4" aria-hidden="true" />
				Latest version
			</a>
			<a
				v-else-if="latestVersion"
				href="https://github.com/creeperkatze/modrinth-extras/releases/latest"
				target="_blank"
				rel="noopener"
				class="flex items-center text-xs gap-1 text-yellow-500 no-underline"
			>
				<ClockIcon class="size-4" aria-hidden="true" />
				Update available
			</a>
			<a
				href="https://github.com/creeperkatze/modrinth-extras"
				target="_blank"
				rel="noopener"
				class="ml-auto flex items-center gap-1 text-xs text-yellow-500 no-underline"
			>
				★ On GitHub
			</a>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ArrowUpRightIcon, CheckCircleIcon, ClockIcon, LoaderCircleIcon } from '@modrinth/assets'
import { ButtonStyled, HorizontalRule } from '@modrinth/ui'
import { onMounted, reactive, ref, watch } from 'vue'
import { browser } from 'wxt/browser'

import { DEFAULTS, loadSettings } from '../../helpers/settings'
import ToggleRow from './ToggleRow.vue'

const version = browser.runtime.getManifest().version
const latestVersion = ref<string | null>(null)
const isLatest = ref(false)
const checking = ref(true)

const settings = reactive({ ...DEFAULTS })

let mounted = false

onMounted(async () => {
	Object.assign(settings, await loadSettings())
	mounted = true

	try {
		const res = await fetch(
			'https://api.github.com/repos/creeperkatze/modrinth-extras/releases/latest',
		)
		if (res.ok) {
			const data = await res.json()
			const tag: string = data.tag_name?.replace(/^v/, '') ?? ''
			if (tag && tag !== version) latestVersion.value = tag
			else if (tag) isLatest.value = true
		}
	} catch (err) {
		console.error('[Modrinth Extras] Update check failed:', err)
	} finally {
		checking.value = false
	}
})

watch(settings, () => {
	if (mounted) browser.storage.local.set({ ...settings })
})
</script>
