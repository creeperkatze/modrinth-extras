<template>
	<div class="flex h-[500px] w-[380px] flex-col">
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
			<FeatureGroup :label="formatMessage(messages['popup.group.general'])">
				<div class="rounded-xl transition-colors duration-200 hover:bg-surface-3">
					<div class="flex items-center gap-3 px-2 py-2">
						<LanguagesIcon aria-hidden="true" class="!size-6 shrink-0 text-secondary" />
						<div class="min-w-0 flex-1">
							<div class="text-sm font-semibold text-contrast">
								{{ formatMessage(messages['settings.language']) }}
							</div>
							<div class="text-xs text-secondary">
								<IntlFormatted :message-id="messages['settings.language.description']">
									<template #link="{ children }">
										<a
											href="https://crowdin.com/project/modrinth-extras"
											target="_blank"
											rel="noopener"
											class="text-link"
											@click.stop
										>
											<component :is="() => children" />
										</a>
									</template>
								</IntlFormatted>
							</div>
						</div>
						<div class="language-dropdown">
							<DropdownSelect
								:options="localeItems"
								name="language"
								:model-value="selectedLocaleItem"
								:display-name="(item: SelectItem) => item.label"
								@update:model-value="(item: SelectItem) => updateLocale(item.value)"
							/>
						</div>
					</div>
				</div>
				<FeatureRow
					v-for="f in generalFeatures"
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

			<FeatureGroup :label="formatMessage(messages['popup.group.contentPages'])">
				<FeatureRow
					v-for="f in contentPageFeatures"
					:key="f.key"
					:icon="f.icon"
					:title="f.title"
					:description="f.description"
					:model-value="settings[f.key].enabled"
					@update:model-value="updateEnabled(f.key, $event)"
				/>
			</FeatureGroup>

			<HorizontalRule />

			<FeatureGroup :label="formatMessage(messages['popup.group.extension'])">
				<FeatureRow
					v-for="f in extensionFeatures"
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
				{{ formatMessage(messages['popup.footer.checking']) }}
			</span>
			<a
				v-else-if="isLatest"
				href="https://github.com/creeperkatze/modrinth-extras/releases/latest"
				target="_blank"
				rel="noopener"
				class="flex items-center gap-1 text-xs text-brand no-underline transition-colors hover:text-green-300"
			>
				<CheckCircleIcon class="size-4" aria-hidden="true" />
				{{ formatMessage(messages['popup.footer.latestVersion']) }}
			</a>
			<a
				v-else-if="latestVersion"
				href="https://github.com/creeperkatze/modrinth-extras/releases/latest"
				target="_blank"
				rel="noopener"
				class="flex items-center gap-1 text-xs text-yellow-500 no-underline transition-colors hover:text-yellow-300"
			>
				<ClockIcon class="size-4" aria-hidden="true" />
				{{ formatMessage(messages['popup.footer.updateAvailable']) }}
			</a>
			<a
				href="https://ko-fi.com/creeperkatze"
				target="_blank"
				rel="noopener"
				class="ml-auto flex items-center gap-1 text-xs text-[#FF5E5B] no-underline transition-colors hover:text-[#ff8e8c]"
			>
				<KofiIcon class="size-3.5" aria-hidden="true" />
				{{ formatMessage(messages['popup.footer.support']) }}
			</a>
			<a
				href="https://github.com/creeperkatze/modrinth-extras"
				target="_blank"
				rel="noopener"
				class="flex items-center gap-1 text-xs text-yellow-500 no-underline transition-colors hover:text-yellow-300"
			>
				{{ formatMessage(messages['popup.footer.starOnGitHub']) }}
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
	ImageIcon,
	LanguagesIcon,
	LoaderCircleIcon,
	MonitorIcon,
	PlayIcon,
	SearchIcon,
	TagCategoryCameraIcon,
	TagCategoryZapIcon,
	WrenchIcon,
} from '@modrinth/assets'
import {
	ButtonStyled,
	defineMessages,
	DropdownSelect,
	HorizontalRule,
	IntlFormatted,
	ScrollablePanel,
	useVIntl,
} from '@modrinth/ui'
import { type Component, computed, onMounted, reactive, ref } from 'vue'
import { browser } from 'wxt/browser'

import KofiIcon from '../../assets/kofi.svg?component'
import { apiFetch } from '../../helpers/api'
import { detectBrowserLocale, i18n } from '../../helpers/i18n'
import { LOCALES } from '../../helpers/locales'
import { DEFAULTS, type ExtensionSettings, getSettings, saveSettings } from '../../helpers/settings'
import { setTelemetryEnabled } from '../../helpers/telemetry'
import FeatureGroup from './components/FeatureGroup.vue'
import FeatureRow from './components/FeatureRow.vue'
import OptionFieldSelect, { type SelectItem } from './components/OptionFieldSelect.vue'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'popup.group.general': { id: 'popup.group.general', defaultMessage: 'General' },
	'popup.group.contentPages': { id: 'popup.group.contentPages', defaultMessage: 'Content Pages' },
	'popup.group.extension': { id: 'popup.group.extension', defaultMessage: 'Extension' },
	'popup.footer.checking': { id: 'popup.footer.checking', defaultMessage: 'Checking' },
	'popup.footer.latestVersion': {
		id: 'popup.footer.latestVersion',
		defaultMessage: 'Latest version',
	},
	'popup.footer.updateAvailable': {
		id: 'popup.footer.updateAvailable',
		defaultMessage: 'Update available',
	},
	'popup.footer.starOnGitHub': { id: 'popup.footer.starOnGitHub', defaultMessage: '★ On GitHub' },
	'popup.footer.support': { id: 'popup.footer.support', defaultMessage: 'Support' },
	'feature.notifications.title': {
		id: 'feature.notifications.title',
		defaultMessage: 'Notifications',
	},
	'feature.notifications.description': {
		id: 'feature.notifications.description',
		defaultMessage:
			'View, manage, and clear unread notifications right in the header without leaving the current page.',
	},
	'feature.quickSearch.title': { id: 'feature.quickSearch.title', defaultMessage: 'Quick search' },
	'feature.quickSearch.description': {
		id: 'feature.quickSearch.description',
		defaultMessage:
			'Ctrl+K or / for a command palette style search with faceted tags for loaders, versions, categories, and types.',
	},
	'feature.projectCardActions.title': {
		id: 'feature.projectCardActions.title',
		defaultMessage: 'Project card actions',
	},
	'feature.projectCardActions.description': {
		id: 'feature.projectCardActions.description',
		defaultMessage: 'Download, follow, and save projects right from their project cards.',
	},
	'feature.projectCardActions.modLoader': {
		id: 'feature.projectCardActions.modLoader',
		defaultMessage: 'Mod loader',
	},
	'feature.projectCardActions.pluginLoader': {
		id: 'feature.projectCardActions.pluginLoader',
		defaultMessage: 'Plugin loader',
	},
	'feature.activitySparkline.title': {
		id: 'feature.activitySparkline.title',
		defaultMessage: 'Activity sparkline',
	},
	'feature.activitySparkline.description': {
		id: 'feature.activitySparkline.description',
		defaultMessage: 'Release activity chart on project pages.',
	},
	'feature.toolsSidebar.title': {
		id: 'feature.toolsSidebar.title',
		defaultMessage: 'Tools sidebar',
	},
	'feature.toolsSidebar.description': {
		id: 'feature.toolsSidebar.description',
		defaultMessage:
			'Generate embeds, view raw API responses, copy download URLs and packwiz commands.',
	},
	'feature.dependenciesSidebar.title': {
		id: 'feature.dependenciesSidebar.title',
		defaultMessage: 'Dependency sidebar',
	},
	'feature.dependenciesSidebar.description': {
		id: 'feature.dependenciesSidebar.description',
		defaultMessage: 'Collapsible dependency tree on project pages.',
	},
	'feature.githubSidebar.title': {
		id: 'feature.githubSidebar.title',
		defaultMessage: 'GitHub sidebar',
	},
	'feature.githubSidebar.description': {
		id: 'feature.githubSidebar.description',
		defaultMessage: 'Stars, issues, pull requests, and forks for linked repositories.',
	},
	'feature.discordSidebar.title': {
		id: 'feature.discordSidebar.title',
		defaultMessage: 'Discord sidebar',
	},
	'feature.discordSidebar.description': {
		id: 'feature.discordSidebar.description',
		defaultMessage:
			'Server name, description, member count, and online count for linked Discord servers.',
	},
	'feature.galleryBackground.title': {
		id: 'feature.galleryBackground.title',
		defaultMessage: 'Gallery background',
	},
	'feature.galleryBackground.description': {
		id: 'feature.galleryBackground.description',
		defaultMessage: 'Display the featured gallery image as a background banner on project pages.',
	},
	'feature.analyticsExport.title': {
		id: 'feature.analyticsExport.title',
		defaultMessage: 'Analytics export',
	},
	'feature.analyticsExport.description': {
		id: 'feature.analyticsExport.description',
		defaultMessage: 'Adds a button to download analytics charts as PNG images.',
	},
	'feature.notificationBadge.title': {
		id: 'feature.notificationBadge.title',
		defaultMessage: 'Notification badge',
	},
	'feature.notificationBadge.description': {
		id: 'feature.notificationBadge.description',
		defaultMessage: 'Up-to-date unread notification count as a badge on the extension icon.',
	},
	'feature.desktopNotifications.title': {
		id: 'feature.desktopNotifications.title',
		defaultMessage: 'Desktop notifications',
	},
	'feature.desktopNotifications.description': {
		id: 'feature.desktopNotifications.description',
		defaultMessage: 'Operating system notifications for your Modrinth notifications.',
	},
	'feature.desktopNotifications.exampleTitle': {
		id: 'feature.desktopNotifications.exampleTitle',
		defaultMessage: 'Example Notification',
	},
	'feature.desktopNotifications.exampleMessage': {
		id: 'feature.desktopNotifications.exampleMessage',
		defaultMessage: 'This is an example notification from Modrinth Extras!',
	},
	'feature.curseforgeRedirect.title': {
		id: 'feature.curseforgeRedirect.title',
		defaultMessage: 'CurseForge redirect',
	},
	'feature.curseforgeRedirect.description': {
		id: 'feature.curseforgeRedirect.description',
		defaultMessage: 'Redirect CurseForge project pages to Modrinth when available.',
	},
	'feature.telemetry.title': { id: 'feature.telemetry.title', defaultMessage: 'Telemetry' },
	'feature.telemetry.description': {
		id: 'feature.telemetry.description',
		defaultMessage:
			'Help improve the extension by anonymously sharing statistics like the extension version and which features are enabled. No Modrinth data, activity, or personal information is ever collected.',
	},
	'feature.telemetry.disabledTooltip': {
		id: 'feature.telemetry.disabledTooltip',
		defaultMessage: 'Controlled by Firefox data collection settings',
	},
	'settings.language': { id: 'settings.language', defaultMessage: 'Language' },
	'settings.language.description': {
		id: 'settings.language.description',
		defaultMessage: 'Help translate on <link>Crowdin</link>. Some languages may be incomplete.',
	},
})

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

const generalFeatures = computed<FeatureDef[]>(() => [
	{
		key: 'notificationsIndicator',
		icon: BellIcon,
		title: formatMessage(messages['feature.notifications.title']),
		description: formatMessage(messages['feature.notifications.description']),
	},
	{
		key: 'quickSearch',
		icon: SearchIcon,
		title: formatMessage(messages['feature.quickSearch.title']),
		description: formatMessage(messages['feature.quickSearch.description']),
	},
	{
		key: 'projectCardActions',
		icon: TagCategoryZapIcon,
		title: formatMessage(messages['feature.projectCardActions.title']),
		description: formatMessage(messages['feature.projectCardActions.description']),
		options: [
			{
				key: 'modLoader',
				type: 'select',
				label: formatMessage(messages['feature.projectCardActions.modLoader']),
				fetchItems: () => fetchLoadersByType('mod'),
			},
			{
				key: 'pluginLoader',
				type: 'select',
				label: formatMessage(messages['feature.projectCardActions.pluginLoader']),
				fetchItems: () => fetchLoadersByType('plugin'),
			},
		],
	},
	{
		key: 'analyticsExport',
		icon: TagCategoryCameraIcon,
		title: formatMessage(messages['feature.analyticsExport.title']),
		description: formatMessage(messages['feature.analyticsExport.description']),
	},
])

const contentPageFeatures = computed<FeatureDef[]>(() => [
	{
		key: 'activitySparkline',
		icon: ChartIcon,
		title: formatMessage(messages['feature.activitySparkline.title']),
		description: formatMessage(messages['feature.activitySparkline.description']),
	},
	{
		key: 'toolsSidebar',
		icon: WrenchIcon,
		title: formatMessage(messages['feature.toolsSidebar.title']),
		description: formatMessage(messages['feature.toolsSidebar.description']),
	},
	{
		key: 'dependenciesSidebar',
		icon: GitGraphIcon,
		title: formatMessage(messages['feature.dependenciesSidebar.title']),
		description: formatMessage(messages['feature.dependenciesSidebar.description']),
	},
	{
		key: 'githubSidebar',
		icon: GithubIcon,
		title: formatMessage(messages['feature.githubSidebar.title']),
		description: formatMessage(messages['feature.githubSidebar.description']),
	},
	{
		key: 'discordSidebar',
		icon: DiscordIcon,
		title: formatMessage(messages['feature.discordSidebar.title']),
		description: formatMessage(messages['feature.discordSidebar.description']),
	},
	{
		key: 'galleryBackground',
		icon: ImageIcon,
		title: formatMessage(messages['feature.galleryBackground.title']),
		description: formatMessage(messages['feature.galleryBackground.description']),
	},
])

const extensionFeatures = computed<FeatureDef[]>(() => [
	{
		key: 'notificationBadge',
		icon: BellRingIcon,
		title: formatMessage(messages['feature.notificationBadge.title']),
		description: formatMessage(messages['feature.notificationBadge.description']),
	},
	{
		key: 'desktopNotifications',
		icon: MonitorIcon,
		title: formatMessage(messages['feature.desktopNotifications.title']),
		description: formatMessage(messages['feature.desktopNotifications.description']),
		actionIcon: PlayIcon,
		onAction: () => {
			browser.notifications.create({
				type: 'basic',
				iconUrl: browser.runtime.getURL('/icon-128.png'),
				title: formatMessage(messages['feature.desktopNotifications.exampleTitle']),
				message: formatMessage(messages['feature.desktopNotifications.exampleMessage']),
			})
		},
	},
	{
		key: 'curseforgeRedirect',
		icon: CurseForgeIcon,
		title: formatMessage(messages['feature.curseforgeRedirect.title']),
		description: formatMessage(messages['feature.curseforgeRedirect.description']),
	},
	{
		key: 'telemetry',
		icon: ChartIcon,
		title: formatMessage(messages['feature.telemetry.title']),
		description: formatMessage(messages['feature.telemetry.description']),
		disabled: () => firefoxControlsTelemetry.value,
		disabledTooltip: formatMessage(messages['feature.telemetry.disabledTooltip']),
	},
])

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

const localeItems = computed<SelectItem[]>(() =>
	LOCALES.map((l) => ({ label: l.name, value: l.code })),
)

const selectedLocaleItem = computed<SelectItem>(() => {
	const val = settings.locale.value || detectBrowserLocale()
	return localeItems.value.find((i) => i.value === val) ?? localeItems.value[0]
})

async function updateLocale(value: string) {
	settings.locale.value = value
	await saveSettings(settings as ExtensionSettings)
	i18n.global.locale.value = value
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
	i18n.global.locale.value = loaded.locale?.value || detectBrowserLocale()
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
		console.error('[Modrinth Extras] Failed to check for updates:', err)
	} finally {
		checking.value = false
	}
})
</script>

<style scoped>
.language-dropdown :deep(.animated-dropdown) {
	width: 100%;
	height: 2rem;
}

.language-dropdown :deep(.selected) {
	padding: 0 var(--gap-md);
	font-size: var(--font-size-sm);
	white-space: nowrap;
	overflow: hidden;
	text-overflow: ellipsis;
}

.language-dropdown :deep(.option) {
	padding: var(--gap-sm) var(--gap-md);
	font-size: var(--font-size-sm);
}
</style>
