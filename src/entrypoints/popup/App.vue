<template>
	<div class="flex h-[500px] w-[360px] flex-col">
		<header class="flex shrink-0 items-center gap-3 px-4 py-3.5">
			<a
				href="https://github.com/creeperkatze/modrinth-extras"
				target="_blank"
				rel="noopener"
				class="flex min-w-0 flex-1 items-center gap-3 no-underline"
			>
				<img :src="browser.runtime.getURL('/logo.svg')" alt="Modrinth Extras" class="h-10" />
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
			<FeatureGroup label="General">
				<FeatureRow
					v-for="f in GENERAL_FEATURES"
					:key="f.key"
					:icon="f.icon"
					:title="f.title"
					:description="f.description"
					:model-value="(settings as Record<string, boolean>)[f.key]"
					@update:model-value="updateSetting(f.key, $event)"
				/>
			</FeatureGroup>

			<HorizontalRule />

			<FeatureGroup label="Content Pages">
				<FeatureRow
					v-for="f in CONTENT_PAGE_FEATURES"
					:key="f.key"
					:icon="f.icon"
					:title="f.title"
					:description="f.description"
					:model-value="(settings as Record<string, boolean>)[f.key]"
					@update:model-value="updateSetting(f.key, $event)"
				/>
			</FeatureGroup>

			<HorizontalRule />

			<FeatureGroup label="Extension">
				<FeatureRow
					v-for="f in EXTENSION_FEATURES"
					:key="f.key"
					:icon="f.icon"
					:title="f.title"
					:description="f.description"
					:action-icon="f.actionIcon"
					:model-value="(settings as Record<string, boolean>)[f.key]"
					@update:model-value="updateSetting(f.key, $event)"
					@action="f.onAction?.()"
				/>
			</FeatureGroup>
		</div>

		<HorizontalRule class="shrink-0" />

		<div class="flex shrink-0 items-center gap-2 px-3 py-1.5">
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
				class="flex items-center gap-1 text-xs text-brand no-underline transition-colors hover:text-green-400"
			>
				<CheckCircleIcon class="size-4" aria-hidden="true" />
				Latest version
			</a>
			<a
				v-else-if="latestVersion"
				href="https://github.com/creeperkatze/modrinth-extras/releases/latest"
				target="_blank"
				rel="noopener"
				class="flex items-center gap-1 text-xs text-yellow-500 no-underline transition-colors hover:text-yellow-300"
			>
				<ClockIcon class="size-4" aria-hidden="true" />
				Update available
			</a>
			<a
				href="https://github.com/creeperkatze/modrinth-extras"
				target="_blank"
				rel="noopener"
				class="ml-auto flex items-center gap-1 text-xs text-yellow-500 no-underline transition-colors hover:text-yellow-300"
			>
				★ On GitHub
			</a>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	ArrowUpRightIcon,
	BellIcon,
	BellRingIcon,
	ChartIcon,
	CheckCircleIcon,
	ClockIcon,
	CurseForgeIcon,
	DiscordIcon,
	GitGraphIcon,
	GithubIcon,
	LoaderCircleIcon,
	MonitorIcon,
	PlayIcon,
	SearchIcon,
	TagCategoryZapIcon,
	WrenchIcon,
} from '@modrinth/assets'
import { ButtonStyled, HorizontalRule } from '@modrinth/ui'
import { type Component, onMounted, reactive, ref } from 'vue'
import { browser } from 'wxt/browser'

import { DEFAULTS, loadSettings } from '../../helpers/settings'
import { setTelemetryEnabled } from '../../helpers/telemetry'
import FeatureGroup from './FeatureGroup.vue'
import FeatureRow from './FeatureRow.vue'

interface FeatureDef {
	key: string
	icon: Component
	title: string
	description: string
	actionIcon?: Component
	onAction?: () => void
}

const GENERAL_FEATURES: FeatureDef[] = [
	{
		key: 'showNotificationsIndicator',
		icon: BellIcon,
		title: 'Notifications',
		description:
			'View, manage, and clear unread notifications right in the header without leaving the current page.',
	},
	{
		key: 'showQuickSearch',
		icon: SearchIcon,
		title: 'Quick search',
		description:
			'Command palette-style search with faceted tags for loader, version, category, and type.',
	},
	{
		key: 'showProjectCardActions',
		icon: TagCategoryZapIcon,
		title: 'Project card actions',
		description: 'Download, follow, and bookmark projects right from their project cards.',
	},
]

const CONTENT_PAGE_FEATURES: FeatureDef[] = [
	{
		key: 'showActivitySparkline',
		icon: ChartIcon,
		title: 'Activity sparkline',
		description: 'Release activity chart on project pages.',
	},
	{
		key: 'showToolsSidebar',
		icon: WrenchIcon,
		title: 'Tools sidebar',
		description:
			'Generate embeds, view raw API responses, copy download URLs and packwiz commands.',
	},
	{
		key: 'showDependenciesSidebar',
		icon: GitGraphIcon,
		title: 'Dependency sidebar',
		description: 'Collapsible dependency tree on project pages.',
	},
	{
		key: 'showGitHubSidebar',
		icon: GithubIcon,
		title: 'GitHub sidebar',
		description: 'Stars, issues, pull requests, and forks for linked repositories.',
	},
	{
		key: 'showDiscordSidebar',
		icon: DiscordIcon,
		title: 'Discord sidebar',
		description:
			'Server name, description, member count, and online count for linked Discord servers',
	},
]

const EXTENSION_FEATURES: FeatureDef[] = [
	{
		key: 'showBadge',
		icon: BellRingIcon,
		title: 'Notification badge',
		description: 'Up-to-date unread notification count as a badge on the extension icon.',
	},
	{
		key: 'desktopNotifications',
		icon: MonitorIcon,
		title: 'Desktop notifications',
		description: 'Operating system notifications for your Modrinth notifications.',
		actionIcon: PlayIcon,
		onAction: () => {
			browser.notifications.create({
				type: 'basic',
				iconUrl: browser.runtime.getURL('/icon-128.png'),
				title: 'Example Notification',
				message: 'This is an examples notification from Modrinth Extras!',
			})
		},
	},
	{
		key: 'curseforgeRedirect',
		icon: CurseForgeIcon,
		title: 'CurseForge redirect',
		description: 'Redirect CurseForge project pages to Modrinth when available.',
	},
	{
		key: 'telemetryEnabled',
		icon: ChartIcon,
		title: 'Telemetry',
		description:
			'Help improve the extension by anonymously sharing statistics like the extension version and which features are enabled. No Modrinth data, activity, or personal information is ever collected.',
	},
]

async function updateSetting(key: string, value: boolean) {
	;(settings as Record<string, boolean>)[key] = value
	browser.storage.local.set({ [key]: value })
	if (key === 'telemetryEnabled') setTelemetryEnabled(value)

	if (key === 'desktopNotifications' && value) {
		const granted = await browser.permissions.request({ permissions: ['notifications'] })
		if (!granted) {
			;(settings as Record<string, boolean>)[key] = false
			browser.storage.local.set({ [key]: false })
		}
	}
}

const version = browser.runtime.getManifest().version
const latestVersion = ref<string | null>(null)
const isLatest = ref(false)
const checking = ref(true)

const settings = reactive({ ...DEFAULTS })

onMounted(async () => {
	const loaded = await loadSettings()
	Object.assign(settings, loaded)

	if (loaded.desktopNotifications) {
		const granted = await browser.permissions.contains({ permissions: ['notifications'] })
		if (!granted) {
			settings.desktopNotifications = false
			browser.storage.local.set({ desktopNotifications: false })
		}
	}

	try {
		const CACHE_KEY = 'updateCheckCache'
		const CACHE_TTL = 60 * 60 * 1000 // 1 hour

		const cached = await browser.storage.local.get(CACHE_KEY)
		const entry = cached[CACHE_KEY] as { tag: string; ts: number } | undefined
		let tag: string

		if (entry && Date.now() - entry.ts < CACHE_TTL) {
			tag = entry.tag
		} else {
			const res = await fetch(
				'https://api.github.com/repos/creeperkatze/modrinth-extras/releases/latest',
			)
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			const data = await res.json()
			tag = data.tag_name?.replace(/^v/, '') ?? ''
			await browser.storage.local.set({ [CACHE_KEY]: { tag, ts: Date.now() } })
		}

		if (tag && tag !== version) latestVersion.value = tag
		else if (tag) isLatest.value = true
	} catch (err) {
		console.error('[Modrinth Extras] Update check failed:', err)
	} finally {
		checking.value = false
	}
})
</script>
