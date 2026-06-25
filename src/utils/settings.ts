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
	projectCardActions: {
		enabled: boolean
		modLoader: string
		pluginLoader: string
		shaderLoader: string
		gameVersion: string
	}
	activitySparkline: { enabled: boolean }
	toolsSidebar: { enabled: boolean }
	dependencySidebar: { enabled: boolean }
	dependencyExplorer: { enabled: boolean }
	githubSidebar: { enabled: boolean }
	discordSidebar: { enabled: boolean }
	galleryBackground: { enabled: boolean }
	notificationBadge: { enabled: boolean }
	desktopNotifications: { enabled: boolean }
	curseforgeRedirect: { enabled: boolean }
	telemetry: { enabled: boolean }
}

export const DEFAULTS: ExtensionSettings = {
	locale: { value: '' },
	notificationsIndicator: { enabled: true },
	quickSearch: { enabled: true },
	projectCardActions: {
		enabled: true,
		modLoader: '',
		pluginLoader: '',
		shaderLoader: '',
		gameVersion: '',
	},
	activitySparkline: { enabled: true },
	toolsSidebar: { enabled: true },
	dependencySidebar: { enabled: true },
	dependencyExplorer: { enabled: true },
	githubSidebar: { enabled: true },
	discordSidebar: { enabled: true },
	galleryBackground: { enabled: true },
	notificationBadge: { enabled: true },
	desktopNotifications: { enabled: false },
	curseforgeRedirect: { enabled: false },
	telemetry: { enabled: true },
}

let cache: ExtensionSettings = structuredClone(DEFAULTS)
let init: Promise<void> | null = null

function startInit(): Promise<void> {
	if (init) return init
	init = (async () => {
		const stored = await browser.storage.local.get(STORAGE_KEY)
		const data = stored[STORAGE_KEY] as DeepPartial<ExtensionSettings> | undefined
		cache = deepMerge(DEFAULTS, data ?? {})
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
