<template>
	<div class="flex min-h-0 flex-1 flex-col">
		<div class="shrink-0 px-3 pt-3">
			<Tabs
				v-model:value="tab"
				:tabs="tabs"
				class="!w-full [&>button]:min-w-0 [&>button]:flex-auto [&>button]:px-2 [&_span]:truncate"
			/>
		</div>

		<!-- Keyed by tab so switching starts at the top -->
		<ScrollablePanel
			:key="tab"
			class="min-h-0 flex-1 [&>.scrollable-pane-wrapper]:h-full [&__.scrollable-pane]:max-h-none [&__.scrollable-pane]:!gap-0 [&__.scrollable-pane]:pt-3 [&__.wrapper-wrapper]:overflow-visible"
		>
			<template v-if="tab === 'general'">
				<FeatureGroup>
					<SettingCard :icon="LanguagesIcon" :title="formatMessage(messages['settings.language'])">
						<template #description>
							<IntlFormatted :message-id="messages['settings.language.description']">
								<template #link="{ children }">
									<a
										href="https://crowdin.com/project/modrinth-extras"
										target="_blank"
										rel="noopener"
										class="text-link"
									>
										<component :is="() => children" />
									</a>
								</template>
							</IntlFormatted>
						</template>
						<template #control>
							<div class="language-dropdown">
								<CompactCombobox
									:options="localeItems"
									:model-value="selectedLocale"
									show-icon-in-selected
									@update:model-value="updateLocale"
								/>
							</div>
						</template>
					</SettingCard>
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
									:model-value="
										(settings[f.key] as unknown as Record<string, string>)[opt.key] ?? ''
									"
									:default-color="opt.defaultColor"
									:warning="opt.warning?.()"
									@update:model-value="updateOption(f.key, opt.key, $event)"
								/>
								<OptionFieldToggle
									v-else-if="opt.type === 'toggle'"
									:label="opt.label"
									:model-value="!!(settings[f.key] as unknown as Record<string, boolean>)[opt.key]"
									@update:model-value="updateOption(f.key, opt.key, $event)"
								/>
								<OptionFieldSelect
									v-else
									:label="opt.label"
									:model-value="
										(settings[f.key] as unknown as Record<string, string>)[opt.key] ?? ''
									"
									:items="opt.items"
									:fetch-items="opt.fetchItems"
									:searchable="opt.searchable"
									@update:model-value="updateOption(f.key, opt.key, $event)"
								/>
							</template>
						</template>
					</FeatureRow>
				</FeatureGroup>
			</template>

			<template v-else-if="tab === 'projects' || tab === 'sidebar'">
				<FeatureGroup>
					<FeatureRow
						v-for="f in pageFeatures"
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
									:model-value="
										(settings[f.key] as unknown as Record<string, string>)[opt.key] ?? ''
									"
									:default-color="opt.defaultColor"
									:warning="opt.warning?.()"
									@update:model-value="updateOption(f.key, opt.key, $event)"
								/>
								<OptionFieldToggle
									v-else-if="opt.type === 'toggle'"
									:label="opt.label"
									:model-value="!!(settings[f.key] as unknown as Record<string, boolean>)[opt.key]"
									@update:model-value="updateOption(f.key, opt.key, $event)"
								/>
								<OptionFieldText
									v-else-if="opt.type === 'text'"
									:label="opt.label"
									:model-value="
										(settings[f.key] as unknown as Record<string, string>)[opt.key] ?? ''
									"
									@update:model-value="updateOption(f.key, opt.key, $event)"
								/>
								<OptionFieldSelect
									v-else
									:label="opt.label"
									:model-value="
										(settings[f.key] as unknown as Record<string, string>)[opt.key] ?? ''
									"
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
			</template>

			<FeatureGroup v-else>
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
				<ResetSettingsCard @reset="resetSettings" />
			</FeatureGroup>
		</ScrollablePanel>
	</div>
</template>

<script setup lang="ts">
import { GitBranch, Network } from '@lucide/vue'
import type { Labrinth } from '@modrinth/api-client'
import {
	BellIcon,
	BellRingIcon,
	BoxesIcon,
	ChartIcon,
	CurrencyIcon,
	CurseForgeIcon,
	DiscordIcon,
	getLoaderIcon,
	GitGraphIcon,
	ImageIcon,
	LanguagesIcon,
	MonitorIcon,
	PackageIcon,
	PaintbrushIcon,
	PaletteIcon,
	PlayIcon,
	SearchIcon,
	StarIcon,
	TagCategoryZapIcon,
	WrenchIcon,
} from '@modrinth/assets'
import {
	defineMessages,
	formatLoader,
	IntlFormatted,
	ScrollablePanel,
	Tabs,
	useVIntl,
} from '@modrinth/ui'
import { type Component, computed, h, onMounted, ref, watch } from 'vue'
import { browser } from 'wxt/browser'

import { modrinthClient } from '../../../api/client'
import ModgradeIcon from '../../../assets/icons/modgrade.svg?component'
import ModsrcIcon from '../../../assets/icons/modsrc.svg?component'
import CompactCombobox from '../../../components/ui/CompactCombobox.vue'
import { detectBrowserLocale } from '../../../core/i18n/i18n'
import { localeFlagUrl, LOCALES } from '../../../core/i18n/locales'
import { DEFAULTS, type ExtensionSettings } from '../../../core/settings'
import { accentColorIssue } from '../../../features/accent-color/contrast'
import { readModrinthTheme } from '../../../features/themes/website-theme'
import { isTranslationSupported } from '../../../features/translation/translator'
import FeatureGroup from '../components/FeatureGroup.vue'
import FeatureRow from '../components/FeatureRow.vue'
import OptionFieldColor from '../components/OptionFieldColor.vue'
import OptionFieldSelect, { type SelectItem } from '../components/OptionFieldSelect.vue'
import OptionFieldText from '../components/OptionFieldText.vue'
import OptionFieldToggle from '../components/OptionFieldToggle.vue'
import ResetSettingsCard from '../components/ResetSettingsCard.vue'
import SettingCard from '../components/SettingCard.vue'
import {
	type FeatureKey,
	firefoxControlsTelemetry,
	resetSettings,
	settings,
	updateEnabled,
	updateLocale,
	updateOption,
} from '../state/settings'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	// Short so all tabs fit on one row
	'popup.tab.projects': { id: 'popup.tab.projects', defaultMessage: 'Projects' },
	'popup.group.general': { id: 'popup.group.general', defaultMessage: 'General' },
	'popup.group.sidebar': { id: 'popup.group.sidebar', defaultMessage: 'Sidebar' },
	'popup.group.extension': { id: 'popup.group.extension', defaultMessage: 'Extension' },
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
	'feature.projectCardActions.downloadDependencies': {
		id: 'feature.projectCardActions.downloadDependencies',
		defaultMessage: 'Download dependencies',
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
	'feature.accentColor.lowContrast': {
		id: 'feature.accentColor.lowContrast',
		defaultMessage: 'This color is hard to see on your Modrinth theme.',
	},
	'feature.accentColor.unreadableButtons': {
		id: 'feature.accentColor.unreadableButtons',
		defaultMessage: 'Text on buttons in this color is hard to read on your Modrinth theme.',
	},
	'feature.themes.title': {
		id: 'feature.themes.title',
		defaultMessage: 'Themes',
	},
	'feature.themes.description': {
		id: 'feature.themes.description',
		defaultMessage: 'More color themes for Modrinth, plus your own.',
	},
	'feature.themes.presets': {
		id: 'feature.themes.presets',
		defaultMessage: 'Include preset themes',
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
		defaultMessage: '{count, plural, one {# day} other {# days}}',
	},
	'feature.toolsSidebar.title': {
		id: 'feature.toolsSidebar.title',
		defaultMessage: 'Tools',
	},
	'feature.toolsSidebar.description': {
		id: 'feature.toolsSidebar.description',
		defaultMessage: 'Generate embeds, copy mod manager install commands, and decompile mods.',
	},
	'feature.toolsSidebar.modManager': {
		id: 'feature.toolsSidebar.modManager',
		defaultMessage: 'Mod manager',
	},
	'feature.toolsSidebar.decompiler': {
		id: 'feature.toolsSidebar.decompiler',
		defaultMessage: 'Decompiler',
	},
	'feature.compareVersions.title': {
		id: 'feature.compareVersions.title',
		defaultMessage: 'Compare versions',
	},
	'feature.compareVersions.description': {
		id: 'feature.compareVersions.description',
		defaultMessage:
			'Compare the decompiled code of versions in modsrc, from version pages, the versions list and the changelog.',
	},
	'feature.dependencySidebar.title': {
		id: 'feature.dependencySidebar.title',
		defaultMessage: 'Dependencies',
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
		defaultMessage: 'Requires Dependencies to be enabled',
	},
	'feature.githubSidebar.title': {
		id: 'feature.githubSidebar.title',
		defaultMessage: 'Repository',
	},
	'feature.githubSidebar.description': {
		id: 'feature.githubSidebar.description',
		defaultMessage:
			'Stars, issues, pull requests, and forks for linked GitHub, GitLab, Codeberg, and Bitbucket repositories.',
	},
	'feature.discordSidebar.title': {
		id: 'feature.discordSidebar.title',
		defaultMessage: 'Discord',
	},
	'feature.discordSidebar.description': {
		id: 'feature.discordSidebar.description',
		defaultMessage:
			'Server name, description, member count, and online count for linked Discord servers.',
	},
	'feature.modpacksSidebar.title': {
		id: 'feature.modpacksSidebar.title',
		defaultMessage: 'Modpacks',
	},
	'feature.modpacksSidebar.description': {
		id: 'feature.modpacksSidebar.description',
		defaultMessage: 'Show all the modpacks the mod is featured in.',
	},
	'feature.platformsSidebar.title': {
		id: 'feature.platformsSidebar.title',
		defaultMessage: 'Other platforms',
	},
	'feature.platformsSidebar.description': {
		id: 'feature.platformsSidebar.description',
		defaultMessage: 'Find the same project or author on CurseForge, Hangar, and SpigotMC.',
	},
	'feature.modgradeSidebar.title': {
		id: 'feature.modgradeSidebar.title',
		defaultMessage: 'Modgrade',
	},
	'feature.modgradeSidebar.description': {
		id: 'feature.modgradeSidebar.description',
		defaultMessage: 'Show the Modgrade security check results of a project.',
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
	'feature.reviews.title': {
		id: 'feature.reviews.title',
		defaultMessage: 'Reviews',
	},
	'feature.reviews.description': {
		id: 'feature.reviews.description',
		defaultMessage:
			'Adds a Reviews tab to projects with community reviews from ModDex, CurseForge, and SpigotMC.',
	},
	'feature.reviews.moddex': {
		id: 'feature.reviews.moddex',
		defaultMessage: 'ModDex reviews',
	},
	'feature.reviews.curseforge': {
		id: 'feature.reviews.curseforge',
		defaultMessage: 'CurseForge comments',
	},
	'feature.reviews.spigot': {
		id: 'feature.reviews.spigot',
		defaultMessage: 'SpigotMC reviews',
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
		defaultMessage: 'Send test',
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

interface FeatureOption {
	key: string
	type: 'select' | 'color' | 'toggle' | 'text'
	label: string
	items?: SelectItem[]
	fetchItems?: () => Promise<SelectItem[]>
	searchable?: boolean
	includeAny?: boolean
	defaultColor?: string
	warning?: () => string | undefined
}

const MOD_MANAGER_ITEMS: SelectItem[] = [
	{ label: 'packwiz', value: 'packwiz' },
	{ label: 'Ferium', value: 'ferium' },
	{ label: 'Pakku', value: 'pakku' },
	{ label: 'Lucy', value: 'lucy' },
]

const DECOMPILER_ITEMS: SelectItem[] = [
	{ label: 'slicer', value: 'slicer' },
	{ label: 'modsrc', value: 'modsrc' },
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

// Colored per loader like Modrinth's search filters. Inline so it wins over the dropdown's icon color.
function loaderIcon(loader: string): Component | undefined {
	const icon = getLoaderIcon(loader)
	if (!icon) return undefined
	return () => h(icon, { style: { color: `var(--color-platform-${loader})` } })
}

let loadersRequest: Promise<Labrinth.Tags.v2.Loader[]> | undefined

async function fetchLoadersByType(...types: string[]): Promise<SelectItem[]> {
	loadersRequest ??= modrinthClient.request<Labrinth.Tags.v2.Loader[]>('/tag/loader', {
		api: 'labrinth',
		version: 3,
	})
	const data = await loadersRequest
	return data
		.filter((l) => types.some((type) => l.supported_project_types.includes(type)))
		.map((l) => ({
			label: formatLoader(formatMessage, l.name),
			value: l.name,
			icon: loaderIcon(l.name),
		}))
}

async function fetchGameVersions(): Promise<SelectItem[]> {
	const data = await modrinthClient.request<Labrinth.Tags.v2.GameVersion[]>('/tag/game_version', {
		api: 'labrinth',
		version: 2,
	})
	return data.map((v) => ({
		label: v.version,
		value: v.version,
		snapshot: v.version_type !== 'release',
	}))
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
			{
				key: 'downloadDependencies',
				type: 'toggle',
				label: formatMessage(messages['feature.projectCardActions.downloadDependencies']),
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
				warning: () => accentColorWarning.value,
			},
		],
	},
	{
		key: 'themes',
		icon: PaintbrushIcon,
		title: formatMessage(messages['feature.themes.title']),
		description: formatMessage(messages['feature.themes.description']),
		options: [
			{
				key: 'presets',
				type: 'toggle',
				label: formatMessage(messages['feature.themes.presets']),
			},
		],
	},
])

const contentPageFeatures = computed<FeatureDef[]>(() => [
	{
		key: 'reviews',
		icon: StarIcon,
		title: formatMessage(messages['feature.reviews.title']),
		description: formatMessage(messages['feature.reviews.description']),
		options: [
			{
				key: 'moddex',
				type: 'toggle',
				label: formatMessage(messages['feature.reviews.moddex']),
			},
			{
				key: 'curseforge',
				type: 'toggle',
				label: formatMessage(messages['feature.reviews.curseforge']),
			},
			{
				key: 'spigot',
				type: 'toggle',
				label: formatMessage(messages['feature.reviews.spigot']),
			},
		],
	},
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
		key: 'compareVersions',
		icon: ModsrcIcon,
		title: formatMessage(messages['feature.compareVersions.title']),
		description: formatMessage(messages['feature.compareVersions.description']),
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

const sidebarFeatures = computed<FeatureDef[]>(() => [
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
			{
				key: 'decompiler',
				type: 'select',
				label: formatMessage(messages['feature.toolsSidebar.decompiler']),
				items: DECOMPILER_ITEMS,
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
		key: 'platformsSidebar',
		icon: BoxesIcon,
		title: formatMessage(messages['feature.platformsSidebar.title']),
		description: formatMessage(messages['feature.platformsSidebar.description']),
	},
	{
		key: 'modgradeSidebar',
		icon: ModgradeIcon,
		title: formatMessage(messages['feature.modgradeSidebar.title']),
		description: formatMessage(messages['feature.modgradeSidebar.description']),
	},
])

type PopupTab = 'general' | 'projects' | 'sidebar' | 'extension'

const tabs = computed<{ value: PopupTab; label: string }[]>(() => [
	{ value: 'general', label: formatMessage(messages['popup.group.general']) },
	{ value: 'projects', label: formatMessage(messages['popup.tab.projects']) },
	{ value: 'sidebar', label: formatMessage(messages['popup.group.sidebar']) },
	{ value: 'extension', label: formatMessage(messages['popup.group.extension']) },
])

const TAB_STORAGE_KEY = 'popup-tab'

function savedTab(): PopupTab {
	try {
		const saved = localStorage.getItem(TAB_STORAGE_KEY)
		return tabs.value.some((t) => t.value === saved) ? (saved as PopupTab) : 'general'
	} catch {
		return 'general'
	}
}

// Reopens on the tab that was open last
const tab = ref<PopupTab>(savedTab())
watch(tab, (value) => {
	try {
		localStorage.setItem(TAB_STORAGE_KEY, value)
	} catch {
		// Remembering the tab is optional
	}
})

const pageFeatures = computed(() =>
	tab.value === 'sidebar' ? sidebarFeatures.value : contentPageFeatures.value,
)

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
			browser.notifications?.create({
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

function flagIcon(url: string): Component {
	return () =>
		h('img', {
			src: url,
			alt: '',
			'aria-hidden': 'true',
			loading: 'lazy',
			// Inline so it wins over the square icon size the dropdown gives every option icon
			style: { width: '1.25rem', height: '0.875rem', objectFit: 'cover', borderRadius: '2px' },
		})
}

const localeItems = computed<SelectItem[]>(() =>
	LOCALES.map((l) => {
		const flag = localeFlagUrl(l.code)
		return { label: l.name, value: l.code, icon: flag ? flagIcon(flag) : undefined }
	}),
)

const selectedLocale = computed(() => {
	const val = settings.locale.value || detectBrowserLocale()
	return localeItems.value.some((i) => i.value === val) ? val : localeItems.value[0].value
})

const translationSupported = isTranslationSupported()
const modrinthTheme = ref('dark')

const accentColorWarning = computed(() => {
	const issue = accentColorIssue(settings.accentColor.color, modrinthTheme.value)
	if (issue === 'background') return formatMessage(messages['feature.accentColor.lowContrast'])
	if (issue === 'buttonText')
		return formatMessage(messages['feature.accentColor.unreadableButtons'])
	return undefined
})

onMounted(async () => {
	modrinthTheme.value = await readModrinthTheme()
})
</script>

<style scoped>
.language-dropdown {
	width: 9.5rem;
}
</style>
