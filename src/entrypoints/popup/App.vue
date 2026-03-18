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

		<div v-if="view === 'main'" class="min-h-0 flex-1 overflow-y-auto">
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

		<div v-else class="min-h-0 flex-1 overflow-y-auto">
			<FeatureGroup label="Privacy">
				<FeatureRow
					v-for="f in PRIVACY_FEATURES"
					:key="f.key"
					:icon="f.icon"
					:title="f.title"
					:description="f.description"
					:model-value="(settings as Record<string, boolean>)[f.key]"
					@update:model-value="updateSetting(f.key, $event)"
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
			<button
				type="button"
				:aria-label="view === 'main' ? 'Settings' : 'Back'"
				class="cursor-pointer border-0 bg-transparent p-0 text-secondary transition-colors hover:text-contrast"
				@click="view = view === 'main' ? 'settings' : 'main'"
			>
				<component :is="view === 'main' ? SettingsIcon : XIcon" class="size-4" aria-hidden="true" />
			</button>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	ArrowUpRightIcon,
	BellIcon,
	BellRingIcon,
	BlocksIcon,
	ChartIcon,
	CheckCircleIcon,
	ClockIcon,
	DiscordIcon,
	GithubIcon,
	LoaderCircleIcon,
	MonitorIcon,
	PlayIcon,
	SearchIcon,
	SettingsIcon,
	WrenchIcon,
	XIcon,
} from '@modrinth/assets'
import { ButtonStyled, HorizontalRule } from '@modrinth/ui'
import { type Component, onMounted, reactive, ref } from 'vue'
import { browser } from 'wxt/browser'

import { capture, initPopupAnalytics, setAnalyticsEnabled } from '../../helpers/analytics'
import { DEFAULTS, loadSettings } from '../../helpers/settings'
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
		description: 'Bell indicator in the header with popout',
	},
	{
		key: 'showQuickSearch',
		icon: SearchIcon,
		title: 'Quick search',
		description: 'Ctrl+K or / for a command palette style search',
	},
]

const CONTENT_PAGE_FEATURES: FeatureDef[] = [
	{
		key: 'showActivitySparkline',
		icon: ChartIcon,
		title: 'Activity sparkline',
		description: 'Release activity chart on project pages',
	},
	{
		key: 'showToolsSidebar',
		icon: WrenchIcon,
		title: 'Tools sidebar',
		description: 'Utility tools on project, user, and organization pages',
	},
	{
		key: 'showDependenciesSidebar',
		icon: BlocksIcon,
		title: 'Dependency sidebar',
		description: 'Collapsible dependency tree on project pages',
	},
	{
		key: 'showGitHubSidebar',
		icon: GithubIcon,
		title: 'GitHub sidebar',
		description: 'GitHub statistics in the project sidebar',
	},
	{
		key: 'showDiscordSidebar',
		icon: DiscordIcon,
		title: 'Discord sidebar',
		description: 'Discord server info in the project sidebar',
	},
]

const EXTENSION_FEATURES: FeatureDef[] = [
	{
		key: 'showBadge',
		icon: BellRingIcon,
		title: 'Notification badge',
		description: 'Unread notification count as a badge on the extension icon',
	},
	{
		key: 'desktopNotifications',
		icon: MonitorIcon,
		title: 'Desktop notifications',
		description: 'Operating system notifications for notifications from Modrinth',
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
]

const PRIVACY_FEATURES: FeatureDef[] = [
	{
		key: 'analyticsEnabled',
		icon: ChartIcon,
		title: 'Telemetry',
		description:
			'Help improve the extension by anonymously sharing statistics like the extension version and which features are enabled. No Modrinth data, activity, or personal information is ever collected.',
	},
]

function updateSetting(key: string, value: boolean) {
	;(settings as Record<string, boolean>)[key] = value
	browser.storage.local.set({ [key]: value })
	if (key === 'analyticsEnabled') setAnalyticsEnabled(value)
	capture('setting_changed', { setting: key, value })
}

const version = browser.runtime.getManifest().version
const latestVersion = ref<string | null>(null)
const isLatest = ref(false)
const checking = ref(true)

const view = ref<'main' | 'settings'>('main')
const settings = reactive({ ...DEFAULTS })

onMounted(async () => {
	const loaded = await loadSettings()
	Object.assign(settings, loaded)
	await initPopupAnalytics()
	capture('popup_opened', { version, ...settings })

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
</script>
