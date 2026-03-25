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

		<ScrollablePanel
			v-if="settingsLoaded"
			class="min-h-0 flex-1 [&>.scrollable-pane-wrapper]:h-full [&__.scrollable-pane]:max-h-none [&__.scrollable-pane]:!gap-0 [&__.wrapper-wrapper]:overflow-visible"
		>
			<FeatureGroup label="General">
				<FeatureRow
					v-for="f in GENERAL_FEATURES"
					:key="f.key"
					:icon="f.icon"
					:title="f.title"
					:description="f.description"
					:model-value="settings[f.key].enabled"
					@update:model-value="updateEnabled(f.key, $event)"
				>
					<template v-if="f.options">
						<OptionFieldSelect
							v-for="opt in f.options"
							:key="opt.key"
							:label="opt.label"
							:model-value="(settings[f.key] as unknown as Record<string, string>)[opt.key] ?? ''"
							:items="opt.items"
							:fetch-items="opt.fetchItems"
							@update:model-value="updateOption(f.key, opt.key, $event)"
						/>
					</template>
				</FeatureRow>
			</FeatureGroup>

			<HorizontalRule />

			<FeatureGroup label="Content Pages">
				<FeatureRow
					v-for="f in CONTENT_PAGE_FEATURES"
					:key="f.key"
					:icon="f.icon"
					:title="f.title"
					:description="f.description"
					:model-value="settings[f.key].enabled"
					@update:model-value="updateEnabled(f.key, $event)"
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
					:model-value="
						(typeof f.disabled === 'function' ? f.disabled() : f.disabled)
							? false
							: settings[f.key].enabled
					"
					:disabled="typeof f.disabled === 'function' ? f.disabled() : f.disabled"
					:disabled-tooltip="f.disabledTooltip"
					@update:model-value="updateEnabled(f.key, $event)"
					@action="f.onAction?.()"
				/>
			</FeatureGroup>
		</ScrollablePanel>

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
import { ButtonStyled, HorizontalRule, ScrollablePanel } from '@modrinth/ui'
import { type Component, onMounted, reactive, ref } from 'vue'
import { browser } from 'wxt/browser'

import { apiFetch } from '../../helpers/apiFetch'
import { DEFAULTS, type ExtensionSettings, getSettings, saveSettings } from '../../helpers/settings'
import { setTelemetryEnabled } from '../../helpers/telemetry'
import FeatureGroup from './components/FeatureGroup.vue'
import FeatureRow from './components/FeatureRow.vue'
import OptionFieldSelect, { type SelectItem } from './components/OptionFieldSelect.vue'

type FeatureKey = keyof ExtensionSettings

interface FeatureOption {
	key: string
	type: 'select'
	label: string
	items?: SelectItem[]
	fetchItems?: () => Promise<SelectItem[]>
}

interface FeatureDef {
	key: FeatureKey
	icon: Component
	title: string
	description: string
	actionIcon?: Component
	onAction?: () => void
	disabled?: boolean | (() => boolean)
	disabledTooltip?: string
	options?: FeatureOption[]
}

async function fetchLoadersByType(type: string): Promise<SelectItem[]> {
	const data = (await apiFetch('tag/loader', { apiVersion: 3 })) as {
		name: string
		supported_project_types: string[]
	}[]
	return data
		.filter((l) => l.supported_project_types.includes(type))
		.map((l) => ({ label: l.name.charAt(0).toUpperCase() + l.name.slice(1), value: l.name }))
}

const GENERAL_FEATURES: FeatureDef[] = [
	{
		key: 'notificationsIndicator',
		icon: BellIcon,
		title: 'Notifications',
		description:
			'View, manage, and clear unread notifications right in the header without leaving the current page.',
	},
	{
		key: 'quickSearch',
		icon: SearchIcon,
		title: 'Quick search',
		description:
			'Command palette-style search with faceted tags for loader, version, category, and type.',
	},
	{
		key: 'projectCardActions',
		icon: TagCategoryZapIcon,
		title: 'Project card actions',
		description: 'Download, follow, and save projects right from their project cards.',
		options: [
			{
				key: 'modLoader',
				type: 'select',
				label: 'Mod loader',
				fetchItems: () => fetchLoadersByType('mod'),
			},
			{
				key: 'pluginLoader',
				type: 'select',
				label: 'Plugin loader',
				fetchItems: () => fetchLoadersByType('plugin'),
			},
		],
	},
]

const CONTENT_PAGE_FEATURES: FeatureDef[] = [
	{
		key: 'activitySparkline',
		icon: ChartIcon,
		title: 'Activity sparkline',
		description: 'Release activity chart on project pages.',
	},
	{
		key: 'toolsSidebar',
		icon: WrenchIcon,
		title: 'Tools sidebar',
		description:
			'Generate embeds, view raw API responses, copy download URLs and packwiz commands.',
	},
	{
		key: 'dependenciesSidebar',
		icon: GitGraphIcon,
		title: 'Dependency sidebar',
		description: 'Collapsible dependency tree on project pages.',
	},
	{
		key: 'githubSidebar',
		icon: GithubIcon,
		title: 'GitHub sidebar',
		description: 'Stars, issues, pull requests, and forks for linked repositories.',
	},
	{
		key: 'discordSidebar',
		icon: DiscordIcon,
		title: 'Discord sidebar',
		description:
			'Server name, description, member count, and online count for linked Discord servers',
	},
]

const EXTENSION_FEATURES: FeatureDef[] = [
	{
		key: 'notificationBadge',
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
		key: 'telemetry',
		icon: ChartIcon,
		title: 'Telemetry',
		description:
			'Help improve the extension by anonymously sharing statistics like the extension version and which features are enabled. No Modrinth data, activity, or personal information is ever collected.',
		disabled: () => firefoxControlsTelemetry.value,
		disabledTooltip: 'Controlled by Firefox data collection settings',
	},
]

async function updateEnabled(key: keyof ExtensionSettings, enabled: boolean) {
	settings[key].enabled = enabled
	await saveSettings(settings as ExtensionSettings)
	if (key === 'telemetry') setTelemetryEnabled(enabled)
	if (key === 'desktopNotifications' && enabled) {
		const granted = await browser.permissions.request({ permissions: ['notifications'] })
		if (!granted) {
			settings.desktopNotifications.enabled = false
			await saveSettings(settings as ExtensionSettings)
		}
	}
}

async function updateOption(featureKey: keyof ExtensionSettings, optionKey: string, value: string) {
	;(settings[featureKey] as Record<string, unknown>)[optionKey] = value
	await saveSettings(settings as ExtensionSettings)
}

const version = browser.runtime.getManifest().version
const latestVersion = ref<string | null>(null)
const isLatest = ref(false)
const checking = ref(true)
const firefoxControlsTelemetry = ref(false)

const settings = reactive({ ...DEFAULTS })
const settingsLoaded = ref(false)

onMounted(async () => {
	const loaded = await getSettings()
	Object.assign(settings, loaded)
	settingsLoaded.value = true

	const perms = await browser.permissions.getAll()
	if ('data_collection' in perms) {
		const granted = (perms as unknown as { data_collection: string[] }).data_collection
		firefoxControlsTelemetry.value = !granted.includes('technicalAndInteraction')
	}

	if (loaded.desktopNotifications.enabled) {
		const granted = await browser.permissions.contains({ permissions: ['notifications'] })
		if (!granted) {
			settings.desktopNotifications.enabled = false
			await saveSettings(settings as ExtensionSettings)
		}
	}

	try {
		const CACHE_KEY = 'updateCheckCache'
		const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

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
