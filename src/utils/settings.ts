import { storage } from '@wxt-dev/storage'

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

const settingsItem = storage.defineItem<DeepPartial<ExtensionSettings>>('local:settings')

let cache: ExtensionSettings = structuredClone(DEFAULTS)
let init: Promise<void> | null = null

function startInit(): Promise<void> {
	if (init) return init
	init = (async () => {
		const data = await settingsItem.getValue()
		cache = deepMerge(DEFAULTS, data ?? {})
		settingsItem.watch((newValue) => {
			if (newValue) cache = deepMerge(DEFAULTS, newValue)
		})
	})()
	return init
}

export async function getSettings(): Promise<ExtensionSettings> {
	await startInit()
	return cache
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
	// Firefox's structured clone doesn't support Vue reactive proxies, serialize first.
	const plain = JSON.parse(JSON.stringify(settings)) as ExtensionSettings
	cache = plain
	await settingsItem.setValue(plain)
}
