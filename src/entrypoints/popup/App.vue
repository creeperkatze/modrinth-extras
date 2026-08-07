<template>
	<div class="flex h-[500px] w-[380px] flex-col">
		<header class="flex shrink-0 items-center gap-3 px-4 py-3.5">
			<a
				href="https://github.com/creeperkatze/modrinth-extras"
				target="_blank"
				rel="noopener"
				class="flex min-w-0 flex-1 items-center gap-3 no-underline"
			>
				<Logo role="img" aria-label="Modrinth Extras" class="!h-10 !w-auto text-brand" />
			</a>
			<ButtonLink
				href="https://modrinth.com"
				target="_blank"
				type="colored"
				color="brand"
				class="no-underline"
			>
				Modrinth
				<ArrowUpRightIcon aria-hidden="true" />
			</ButtonLink>
		</header>

		<HorizontalRule class="shrink-0" />

		<ScrollablePanel
			v-if="settingsLoaded"
			class="min-h-0 flex-1 [&>.scrollable-pane-wrapper]:h-full [&__.scrollable-pane]:max-h-none [&__.scrollable-pane]:!gap-0 [&__.scrollable-pane]:pt-4 [&__.wrapper-wrapper]:overflow-visible"
		>
			<DiscordCard />

			<DonateCard />

			<SurveyCard />

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
							<CompactCombobox
								:options="localeItems"
								:model-value="selectedLocale"
								@update:model-value="updateLocale"
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
						<template v-for="opt in f.options" :key="opt.key">
							<OptionFieldColor
								v-if="opt.type === 'color'"
								:label="opt.label"
								:model-value="(settings[f.key] as unknown as Record<string, string>)[opt.key] ?? ''"
								:default-color="opt.defaultColor"
								@update:model-value="updateOption(f.key, opt.key, $event)"
							/>
							<OptionFieldSelect
								v-else
								:label="opt.label"
								:model-value="(settings[f.key] as unknown as Record<string, string>)[opt.key] ?? ''"
								:items="opt.items"
								:fetch-items="opt.fetchItems"
								:searchable="opt.searchable"
								@update:model-value="updateOption(f.key, opt.key, $event)"
							/>
						</template>
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
					:model-value="
						(typeof f.disabled === 'function' ? f.disabled() : f.disabled)
							? false
							: settings[f.key].enabled
					"
					:disabled="typeof f.disabled === 'function' ? f.disabled() : f.disabled"
					:disabled-tooltip="f.disabledTooltip"
					@update:model-value="updateEnabled(f.key, $event)"
				>
					<template v-if="f.options">
						<template v-for="opt in f.options" :key="opt.key">
							<OptionFieldColor
								v-if="opt.type === 'color'"
								:label="opt.label"
								:model-value="(settings[f.key] as unknown as Record<string, string>)[opt.key] ?? ''"
								:default-color="opt.defaultColor"
								@update:model-value="updateOption(f.key, opt.key, $event)"
							/>
							<OptionFieldSelect
								v-else
								:label="opt.label"
								:model-value="(settings[f.key] as unknown as Record<string, string>)[opt.key] ?? ''"
								:items="opt.items"
								:fetch-items="opt.fetchItems"
								:searchable="opt.searchable"
								:include-any="opt.includeAny ?? true"
								@update:model-value="updateOption(f.key, opt.key, $event)"
							/>
						</template>
					</template>
				</FeatureRow>
			</FeatureGroup>

			<HorizontalRule />

			<FeatureGroup :label="formatMessage(messages['popup.group.flags'])">
				<FeatureRow
					v-for="f in flagFeatures"
					:key="f.key"
					:icon="f.icon"
					:title="f.title"
					:description="f.description"
					:model-value="modrinthFlags[f.key]"
					@update:model-value="updateModrinthFlag(f.key, $event)"
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
					:action-label="f.actionLabel"
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
			<div class="flex min-w-0 flex-1 items-center gap-2">
				<span class="shrink-0 text-xs text-secondary">v{{ version }}</span>
				<span v-if="checking" class="flex min-w-0 items-center gap-1 text-xs text-muted">
					<LoaderCircleIcon class="!size-3.5 shrink-0 animate-spin" aria-hidden="true" />
					<span class="truncate">{{ formatMessage(messages['popup.footer.checking']) }}</span>
				</span>
				<a
					v-else-if="isLatest"
					href="https://github.com/creeperkatze/modrinth-extras/releases/latest"
					target="_blank"
					rel="noopener"
					class="flex min-w-0 items-center gap-1 text-xs text-green-500 no-underline transition-colors hover:text-green-400"
				>
					<CheckCircleIcon class="!size-3.5 shrink-0" aria-hidden="true" />
					<span class="truncate">{{ formatMessage(messages['popup.footer.latestVersion']) }}</span>
				</a>
				<a
					v-else-if="latestVersion"
					href="https://github.com/creeperkatze/modrinth-extras/releases/latest"
					target="_blank"
					rel="noopener"
					class="flex min-w-0 items-center gap-1 text-xs text-yellow-500 no-underline transition-colors hover:text-yellow-400"
				>
					<ClockIcon class="!size-3.5 shrink-0" aria-hidden="true" />
					<span class="truncate">{{
						formatMessage(messages['popup.footer.updateAvailable'])
					}}</span>
				</a>
			</div>
			<a
				href="https://ko-fi.com/creeperkatze"
				target="_blank"
				rel="noopener"
				class="flex shrink-0 items-center gap-1 text-xs text-[#FF5E5B] no-underline transition-colors hover:text-[#ff8e8c]"
			>
				<KofiIcon class="!size-3.5" aria-hidden="true" />
				{{ formatMessage(messages['popup.footer.donate']) }}
			</a>
			<a
				href="https://github.com/creeperkatze/modrinth-extras"
				target="_blank"
				rel="noopener"
				class="flex shrink-0 items-center gap-1 text-xs text-yellow-500 no-underline transition-colors hover:text-yellow-400"
			>
				<Star class="!size-3.5 shrink-0" aria-hidden="true" />
				<span>{{ formatMessage(messages['popup.footer.starOnGitHub']) }}</span>
			</a>
		</div>
	</div>
</template>

<script setup lang="ts">
import { GitBranch, Network, Star } from '@lucide/vue'
import type { Labrinth } from '@modrinth/api-client'
import {
	ArrowUpRightIcon,
	BellIcon,
	BellRingIcon,
	ChartIcon,
	CheckCircleIcon,
	ClockIcon,
	CompassIcon,
	CurrencyIcon,
	CurseForgeIcon,
	DiscordIcon,
	GitGraphIcon,
	ImageIcon,
	LanguagesIcon,
	LayoutTemplateIcon,
	LoaderCircleIcon,
	MonitorIcon,
	PackageIcon,
	PaletteIcon,
	PlayIcon,
	SearchIcon,
	TagCategoryZapIcon,
	WrenchIcon,
} from '@modrinth/assets'
import {
	ButtonLink,
	defineMessages,
	HorizontalRule,
	IntlFormatted,
	ScrollablePanel,
	useVIntl,
} from '@modrinth/ui'
import { storage } from '@wxt-dev/storage'
import { type Component, computed, onMounted, reactive, ref, watch } from 'vue'
import { browser } from 'wxt/browser'

import KofiIcon from '../../assets/kofi.svg?component'
import CompactCombobox from '../../components/ui/CompactCombobox.vue'
import Logo from '../../public/logo.svg?component'
import { applyAccentColor } from '../../utils/accent-color'
import { modrinthClient } from '../../utils/api'
import { detectBrowserLocale, i18n } from '../../utils/i18n'
import { LOCALES } from '../../utils/locales'
import {
	getModrinthFlags,
	MODRINTH_FLAG_DEFAULTS,
	type ModrinthFlagKey,
	setModrinthFlag,
} from '../../utils/modrinth-flags'
import { DEFAULTS, type ExtensionSettings, getSettings, saveSettings } from '../../utils/settings'
import { setTelemetryEnabled } from '../../utils/telemetry'
import { isTranslationSupported } from '../../utils/translate-description'
import DiscordCard from './components/DiscordCard.vue'
import DonateCard from './components/DonateCard.vue'
import FeatureGroup from './components/FeatureGroup.vue'
import FeatureRow from './components/FeatureRow.vue'
import OptionFieldColor from './components/OptionFieldColor.vue'
import OptionFieldSelect, { type SelectItem } from './components/OptionFieldSelect.vue'
import SurveyCard from './components/SurveyCard.vue'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'popup.group.general': { id: 'popup.group.general', defaultMessage: 'General' },
	'popup.group.contentPages': { id: 'popup.group.contentPages', defaultMessage: 'Content Pages' },
	'popup.group.flags': { id: 'popup.group.flags', defaultMessage: 'Flags' },
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
	'popup.footer.starOnGitHub': { id: 'popup.footer.starOnGitHub', defaultMessage: 'On GitHub' },
	'popup.footer.donate': { id: 'popup.footer.donate', defaultMessage: 'Donate' },
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
	'feature.projectCardActions.shaderLoader': {
		id: 'feature.projectCardActions.shaderLoader',
		defaultMessage: 'Shader loader',
	},
	'feature.projectCardActions.gameVersion': {
		id: 'feature.projectCardActions.gameVersion',
		defaultMessage: 'Game version',
	},
	'feature.accentColor.title': {
		id: 'feature.accentColor.title',
		defaultMessage: 'Accent color',
	},
	'feature.accentColor.description': {
		id: 'feature.accentColor.description',
		defaultMessage: 'Replace the Modrinth green with a custom accent color.',
	},
	'feature.accentColor.color': {
		id: 'feature.accentColor.color',
		defaultMessage: 'Color',
	},
	'feature.activitySparkline.title': {
		id: 'feature.activitySparkline.title',
		defaultMessage: 'Activity sparkline',
	},
	'feature.activitySparkline.description': {
		id: 'feature.activitySparkline.description',
		defaultMessage: 'Release activity chart on project pages.',
	},
	'feature.activitySparkline.timeRange': {
		id: 'feature.activitySparkline.timeRange',
		defaultMessage: 'Time range',
	},
	'feature.activitySparkline.days': {
		id: 'feature.activitySparkline.days',
		defaultMessage: '{count} days',
	},
	'feature.toolsSidebar.title': {
		id: 'feature.toolsSidebar.title',
		defaultMessage: 'Tools sidebar',
	},
	'feature.toolsSidebar.description': {
		id: 'feature.toolsSidebar.description',
		defaultMessage: 'Generate embeds and copy mod manager install commands.',
	},
	'feature.toolsSidebar.modManager': {
		id: 'feature.toolsSidebar.modManager',
		defaultMessage: 'Mod manager',
	},
	'feature.dependencySidebar.title': {
		id: 'feature.dependencySidebar.title',
		defaultMessage: 'Dependency sidebar',
	},
	'feature.dependencySidebar.description': {
		id: 'feature.dependencySidebar.description',
		defaultMessage: 'Collapsible dependency tree on project pages.',
	},
	'feature.dependencyExplorer.title': {
		id: 'feature.dependencyExplorer.title',
		defaultMessage: 'Dependency explorer',
	},
	'feature.dependencyExplorer.description': {
		id: 'feature.dependencyExplorer.description',
		defaultMessage: 'Interactive graph for exploring the full dependency tree.',
	},
	'feature.dependencyExplorer.disabledTooltip': {
		id: 'feature.dependencyExplorer.disabledTooltip',
		defaultMessage: 'Requires the dependency sidebar to be enabled',
	},
	'feature.githubSidebar.title': {
		id: 'feature.githubSidebar.title',
		defaultMessage: 'Repository sidebar',
	},
	'feature.githubSidebar.description': {
		id: 'feature.githubSidebar.description',
		defaultMessage:
			'Stars, issues, pull requests, and forks for linked GitHub, GitLab, Codeberg, and Bitbucket repositories.',
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
	'feature.modpacksSidebar.title': {
		id: 'feature.modpacksSidebar.title',
		defaultMessage: 'Modpacks sidebar',
	},
	'feature.modpacksSidebar.description': {
		id: 'feature.modpacksSidebar.description',
		defaultMessage: 'Show all the modpacks the mod is featured in.',
	},
	'feature.galleryBackground.title': {
		id: 'feature.galleryBackground.title',
		defaultMessage: 'Gallery background',
	},
	'feature.galleryBackground.description': {
		id: 'feature.galleryBackground.description',
		defaultMessage: 'Display the featured gallery image as a background banner on project pages.',
	},
	'feature.monetizationBadge.title': {
		id: 'feature.monetizationBadge.title',
		defaultMessage: 'Monetization badge',
	},
	'feature.searchBackground.title': {
		id: 'feature.searchBackground.title',
		defaultMessage: 'Search background',
	},
	'feature.searchBackground.description': {
		id: 'feature.searchBackground.description',
		defaultMessage: 'Show a banner background on the discover pages.',
	},
	'feature.projectTypesPrimaryNav.title': {
		id: 'feature.projectTypesPrimaryNav.title',
		defaultMessage: 'Project type navigation',
	},
	'feature.projectTypesPrimaryNav.description': {
		id: 'feature.projectTypesPrimaryNav.description',
		defaultMessage:
			'Move mods, plugins, resource packs, and other project types into the main navigation bar.',
	},
	'feature.monetizationBadge.description': {
		id: 'feature.monetizationBadge.description',
		defaultMessage: 'Show the monetization status of a project in the sidebar.',
	},
	'feature.translateDescription.title': {
		id: 'feature.translateDescription.title',
		defaultMessage: 'Translate description',
	},
	'feature.translateDescription.description': {
		id: 'feature.translateDescription.description',
		defaultMessage:
			"On-device translation of a project's description into your language, when it differs.",
	},
	'feature.translateDescription.disabledTooltip': {
		id: 'feature.translateDescription.disabledTooltip',
		defaultMessage: 'Requires APIs not supported in this browser',
	},
	'feature.notificationBadge.title': {
		id: 'feature.notificationBadge.title',
		defaultMessage: 'Notification badge',
	},
	'feature.notificationBadge.description': {
		id: 'feature.notificationBadge.description',
		defaultMessage: 'Up-to-date unread notification count as a badge on the extension icon.',
	},
	'feature.browserNotifications.title': {
		id: 'feature.browserNotifications.title',
		defaultMessage: 'Browser notifications',
	},
	'feature.browserNotifications.description': {
		id: 'feature.browserNotifications.description',
		defaultMessage: 'Browser notifications for your Modrinth notifications.',
	},
	'feature.browserNotifications.exampleTitle': {
		id: 'feature.browserNotifications.exampleTitle',
		defaultMessage: 'Example Notification',
	},
	'feature.browserNotifications.exampleMessage': {
		id: 'feature.browserNotifications.exampleMessage',
		defaultMessage: 'This is an example notification from Modrinth Extras!',
	},
	'feature.browserNotifications.sendTest': {
		id: 'feature.browserNotifications.sendTest',
		defaultMessage: 'Send test notification',
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

type FeatureKey = Exclude<keyof ExtensionSettings, 'locale'>

interface FeatureOption {
	key: string
	type: 'select' | 'color'
	label: string
	items?: SelectItem[]
	fetchItems?: () => Promise<SelectItem[]>
	searchable?: boolean
	includeAny?: boolean
	defaultColor?: string
}

const MOD_MANAGER_ITEMS: SelectItem[] = [
	{ label: 'Packwiz', value: 'packwiz' },
	{ label: 'Ferium', value: 'ferium' },
]

interface FeatureDef {
	key: FeatureKey
	icon: Component
	title: string
	description: string
	actionIcon?: Component
	actionLabel?: string
	onAction?: () => void
	disabled?: boolean | (() => boolean)
	disabledTooltip?: string
	options?: FeatureOption[]
}

const DAY_RANGE_VALUES = [30, 60, 90, 180, 365]

const DAY_RANGE_ITEMS = computed<SelectItem[]>(() =>
	DAY_RANGE_VALUES.map((days) => ({
		label: formatMessage(messages['feature.activitySparkline.days'], { count: days }),
		value: String(days),
	})),
)

async function fetchLoadersByType(...types: string[]): Promise<SelectItem[]> {
	const data = await modrinthClient.request<Labrinth.Tags.v2.Loader[]>('/tag/loader', {
		api: 'labrinth',
		version: 3,
	})
	return data
		.filter((l) => types.some((type) => l.supported_project_types.includes(type)))
		.map((l) => ({ label: l.name.charAt(0).toUpperCase() + l.name.slice(1), value: l.name }))
}

async function fetchGameVersions(): Promise<SelectItem[]> {
	const data = await modrinthClient.request<Labrinth.Tags.v2.GameVersion[]>('/tag/game_version', {
		api: 'labrinth',
		version: 2,
	})
	return data.map((v) => ({ label: v.version, value: v.version }))
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
				key: 'gameVersion',
				type: 'select',
				label: formatMessage(messages['feature.projectCardActions.gameVersion']),
				fetchItems: fetchGameVersions,
				searchable: true,
			},
			{
				key: 'modLoader',
				type: 'select',
				label: formatMessage(messages['feature.projectCardActions.modLoader']),
				fetchItems: () => fetchLoadersByType('mod', 'modpack'),
			},
			{
				key: 'pluginLoader',
				type: 'select',
				label: formatMessage(messages['feature.projectCardActions.pluginLoader']),
				fetchItems: () => fetchLoadersByType('plugin'),
			},
			{
				key: 'shaderLoader',
				type: 'select',
				label: formatMessage(messages['feature.projectCardActions.shaderLoader']),
				fetchItems: () => fetchLoadersByType('shader'),
			},
		],
	},
	{
		key: 'accentColor',
		icon: PaletteIcon,
		title: formatMessage(messages['feature.accentColor.title']),
		description: formatMessage(messages['feature.accentColor.description']),
		options: [
			{
				key: 'color',
				type: 'color',
				label: formatMessage(messages['feature.accentColor.color']),
				defaultColor: DEFAULTS.accentColor.color,
			},
		],
	},
])

const contentPageFeatures = computed<FeatureDef[]>(() => [
	{
		key: 'activitySparkline',
		icon: ChartIcon,
		title: formatMessage(messages['feature.activitySparkline.title']),
		description: formatMessage(messages['feature.activitySparkline.description']),
		options: [
			{
				key: 'days',
				type: 'select',
				label: formatMessage(messages['feature.activitySparkline.timeRange']),
				items: DAY_RANGE_ITEMS.value,
				includeAny: false,
			},
		],
	},
	{
		key: 'toolsSidebar',
		icon: WrenchIcon,
		title: formatMessage(messages['feature.toolsSidebar.title']),
		description: formatMessage(messages['feature.toolsSidebar.description']),
		options: [
			{
				key: 'modManager',
				type: 'select',
				label: formatMessage(messages['feature.toolsSidebar.modManager']),
				items: MOD_MANAGER_ITEMS,
				includeAny: false,
			},
		],
	},
	{
		key: 'dependencySidebar',
		icon: GitGraphIcon,
		title: formatMessage(messages['feature.dependencySidebar.title']),
		description: formatMessage(messages['feature.dependencySidebar.description']),
	},
	{
		key: 'dependencyExplorer',
		icon: Network,
		title: formatMessage(messages['feature.dependencyExplorer.title']),
		description: formatMessage(messages['feature.dependencyExplorer.description']),
		disabled: () => !settings.dependencySidebar.enabled,
		disabledTooltip: formatMessage(messages['feature.dependencyExplorer.disabledTooltip']),
	},
	{
		key: 'githubSidebar',
		icon: GitBranch,
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
		key: 'modpacksSidebar',
		icon: PackageIcon,
		title: formatMessage(messages['feature.modpacksSidebar.title']),
		description: formatMessage(messages['feature.modpacksSidebar.description']),
	},
	{
		key: 'galleryBackground',
		icon: ImageIcon,
		title: formatMessage(messages['feature.galleryBackground.title']),
		description: formatMessage(messages['feature.galleryBackground.description']),
	},
	{
		key: 'monetizationBadge',
		icon: CurrencyIcon,
		title: formatMessage(messages['feature.monetizationBadge.title']),
		description: formatMessage(messages['feature.monetizationBadge.description']),
	},
	{
		key: 'translateDescription',
		icon: LanguagesIcon,
		title: formatMessage(messages['feature.translateDescription.title']),
		description: formatMessage(messages['feature.translateDescription.description']),
		disabled: () => !translationSupported,
		disabledTooltip: formatMessage(messages['feature.translateDescription.disabledTooltip']),
	},
])

interface FlagDef {
	key: ModrinthFlagKey
	icon: Component
	title: string
	description: string
}

const flagFeatures = computed<FlagDef[]>(() => [
	{
		key: 'searchBackground',
		icon: LayoutTemplateIcon,
		title: formatMessage(messages['feature.searchBackground.title']),
		description: formatMessage(messages['feature.searchBackground.description']),
	},
	{
		key: 'projectTypesPrimaryNav',
		icon: CompassIcon,
		title: formatMessage(messages['feature.projectTypesPrimaryNav.title']),
		description: formatMessage(messages['feature.projectTypesPrimaryNav.description']),
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
		title: formatMessage(messages['feature.browserNotifications.title']),
		description: formatMessage(messages['feature.browserNotifications.description']),
		actionIcon: PlayIcon,
		actionLabel: formatMessage(messages['feature.browserNotifications.sendTest']),
		onAction: () => {
			browser.notifications.create({
				type: 'basic',
				iconUrl: browser.runtime.getURL('/icon-128.png'),
				title: formatMessage(messages['feature.browserNotifications.exampleTitle']),
				message: formatMessage(messages['feature.browserNotifications.exampleMessage']),
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

async function updateEnabled(key: FeatureKey, enabled: boolean) {
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

const modrinthFlags = reactive({ ...MODRINTH_FLAG_DEFAULTS })

async function updateModrinthFlag(key: ModrinthFlagKey, value: boolean) {
	modrinthFlags[key] = value
	await setModrinthFlag(key, value)
}

const localeItems = computed<SelectItem[]>(() =>
	LOCALES.map((l) => ({ label: l.name, value: l.code })),
)

const selectedLocale = computed(() => {
	const val = settings.locale.value || detectBrowserLocale()
	return localeItems.value.some((i) => i.value === val) ? val : localeItems.value[0].value
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
const translationSupported = isTranslationSupported()

const updateCheckCacheItem = storage.defineItem<{ tag: string; ts: number }>(
	'local:updateCheckCache',
)

const settings = reactive({ ...DEFAULTS })
const settingsLoaded = ref(false)

watch(
	() => settings.accentColor,
	() => applyAccentColor(settings),
	{ deep: true, immediate: true },
)

onMounted(async () => {
	const loaded = await getSettings()
	Object.assign(settings, loaded)
	i18n.global.locale.value = loaded.locale?.value || detectBrowserLocale()
	settingsLoaded.value = true

	Object.assign(modrinthFlags, await getModrinthFlags())

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
		const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

		const entry = await updateCheckCacheItem.getValue()
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
			await updateCheckCacheItem.setValue({ tag, ts: Date.now() })
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
.language-dropdown {
	width: 8rem;
}
</style>
