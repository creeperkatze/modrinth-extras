import { browser } from 'wxt/browser'

const STORAGE_KEY = 'settings'

type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

function deepMerge<T extends object>(base: T, override: DeepPartial<T>): T {
	const result = { ...base }
	for (const key of Object.keys(override) as (keyof T)[]) {
		const baseVal = base[key]
		const overrideVal = override[key]
		if (
			baseVal != null &&
			typeof baseVal === 'object' &&
			overrideVal != null &&
			typeof overrideVal === 'object'
		) {
			result[key] = deepMerge(baseVal as object, overrideVal as object) as T[typeof key]
		} else if (overrideVal !== undefined) {
			result[key] = overrideVal as T[typeof key]
		}
	}
	return result
}

export interface ExtensionSettings {
	locale: { value: string }
	notificationsIndicator: { enabled: boolean }
	quickSearch: { enabled: boolean }
	projectCardActions: { enabled: boolean; modLoader: string; pluginLoader: string }
	activitySparkline: { enabled: boolean }
	toolsSidebar: { enabled: boolean }
	dependenciesSidebar: { enabled: boolean }
	githubSidebar: { enabled: boolean }
	discordSidebar: { enabled: boolean }
	galleryBackground: { enabled: boolean }
	analyticsExporter: { enabled: boolean }
	notificationBadge: { enabled: boolean }
	desktopNotifications: { enabled: boolean }
	curseforgeRedirect: { enabled: boolean }
	telemetry: { enabled: boolean }
}

export const DEFAULTS: ExtensionSettings = {
	locale: { value: '' },
	notificationsIndicator: { enabled: true },
	quickSearch: { enabled: true },
	projectCardActions: { enabled: true, modLoader: '', pluginLoader: '' },
	activitySparkline: { enabled: true },
	toolsSidebar: { enabled: true },
	dependenciesSidebar: { enabled: true },
	githubSidebar: { enabled: true },
	discordSidebar: { enabled: true },
	galleryBackground: { enabled: true },
	analyticsExporter: { enabled: true },
	notificationBadge: { enabled: true },
	desktopNotifications: { enabled: false },
	curseforgeRedirect: { enabled: false },
	telemetry: { enabled: true },
}

async function migrateFromFlatStorage(): Promise<ExtensionSettings> {
	const old = await browser.storage.local.get([
		'showBadge',
		'desktopNotifications',
		'showNotificationsIndicator',
		'showToolsSidebar',
		'showDependenciesSidebar',
		'showActivitySparkline',
		'showGitHubSidebar',
		'showDiscordSidebar',
		'showQuickSearch',
		'curseforgeRedirect',
		'showProjectCardActions',
		'projectCardActionsModLoader',
		'projectCardActionsPluginLoader',
		'telemetryEnabled',
	])
	const b = (key: string, def: boolean) => (old[key] as boolean | undefined) ?? def
	const s = (key: string, def: string) => (old[key] as string | undefined) ?? def
	return {
		locale: DEFAULTS.locale,
		notificationsIndicator: {
			enabled: b('showNotificationsIndicator', DEFAULTS.notificationsIndicator.enabled),
		},
		quickSearch: {
			enabled: b('showQuickSearch', DEFAULTS.quickSearch.enabled),
		},
		projectCardActions: {
			enabled: b('showProjectCardActions', DEFAULTS.projectCardActions.enabled),
			modLoader: s('projectCardActionsModLoader', DEFAULTS.projectCardActions.modLoader),
			pluginLoader: s('projectCardActionsPluginLoader', DEFAULTS.projectCardActions.pluginLoader),
		},
		activitySparkline: {
			enabled: b('showActivitySparkline', DEFAULTS.activitySparkline.enabled),
		},
		toolsSidebar: {
			enabled: b('showToolsSidebar', DEFAULTS.toolsSidebar.enabled),
		},
		dependenciesSidebar: {
			enabled: b('showDependenciesSidebar', DEFAULTS.dependenciesSidebar.enabled),
		},
		githubSidebar: {
			enabled: b('showGitHubSidebar', DEFAULTS.githubSidebar.enabled),
		},
		discordSidebar: {
			enabled: b('showDiscordSidebar', DEFAULTS.discordSidebar.enabled),
		},
		galleryBackground: DEFAULTS.galleryBackground,
		analyticsExporter: DEFAULTS.analyticsExporter,
		notificationBadge: {
			enabled: b('showBadge', DEFAULTS.notificationBadge.enabled),
		},
		desktopNotifications: {
			enabled: b('desktopNotifications', DEFAULTS.desktopNotifications.enabled),
		},
		curseforgeRedirect: {
			enabled: b('curseforgeRedirect', DEFAULTS.curseforgeRedirect.enabled),
		},
		telemetry: {
			enabled: b('telemetryEnabled', DEFAULTS.telemetry.enabled),
		},
	}
}

let cache: ExtensionSettings = structuredClone(DEFAULTS)
let init: Promise<void> | null = null

function startInit(): Promise<void> {
	if (init) return init
	init = (async () => {
		const stored = await browser.storage.local.get(STORAGE_KEY)
		const data = stored[STORAGE_KEY] as DeepPartial<ExtensionSettings> | undefined
		cache = data ? deepMerge(DEFAULTS, data) : await migrateFromFlatStorage()
		browser.storage.onChanged.addListener((changes) => {
			if ('settings' in changes && changes.settings?.newValue) {
				cache = deepMerge(DEFAULTS, changes.settings.newValue as DeepPartial<ExtensionSettings>)
			}
		})
	})()
	return init
}

export async function getSettings(): Promise<ExtensionSettings> {
	await startInit()
	return cache
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
	// Serialize to a plain object before storing. Firefox's structured clone
	// implementation does not support Proxy objects (e.g. Vue reactive proxies),
	// so passing one directly causes the write to silently fail.
	const plain = JSON.parse(JSON.stringify(settings)) as ExtensionSettings
	cache = plain
	await browser.storage.local.set({ [STORAGE_KEY]: plain })
}
