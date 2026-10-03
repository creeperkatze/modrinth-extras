import { storage } from '@wxt-dev/storage'

type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

// Keys missing from base are dropped, so settings removed in older versions don't linger.
function deepMerge<T extends object>(base: T, override: DeepPartial<T>): T {
	const result = { ...base }
	for (const key of Object.keys(override) as (keyof T)[]) {
		if (!(key in base)) continue
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
		downloadDependencies: boolean
	}
	activitySparkline: { enabled: boolean; days: string }
	toolsSidebar: { enabled: boolean; modManager: string }
	dependencySidebar: { enabled: boolean }
	dependencyExplorer: { enabled: boolean }
	githubSidebar: { enabled: boolean }
	discordSidebar: { enabled: boolean }
	modpacksSidebar: { enabled: boolean }
	platformsSidebar: { enabled: boolean }
	galleryBackground: { enabled: boolean }
	monetizationBadge: { enabled: boolean }
	translateDescription: { enabled: boolean }
	reviews: { enabled: boolean; moddex: boolean; moddexApiToken: string; spigot: boolean }
	notificationBadge: { enabled: boolean }
	desktopNotifications: { enabled: boolean }
	curseforgeRedirect: { enabled: boolean }
	accentColor: { enabled: boolean; color: string }
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
		downloadDependencies: false,
	},
	activitySparkline: { enabled: true, days: '60' },
	toolsSidebar: { enabled: true, modManager: 'packwiz' },
	dependencySidebar: { enabled: true },
	dependencyExplorer: { enabled: true },
	githubSidebar: { enabled: true },
	discordSidebar: { enabled: true },
	modpacksSidebar: { enabled: true },
	platformsSidebar: { enabled: false },
	galleryBackground: { enabled: true },
	monetizationBadge: { enabled: true },
	translateDescription: { enabled: false },
	reviews: { enabled: true, moddex: true, moddexApiToken: '', spigot: true },
	notificationBadge: { enabled: true },
	desktopNotifications: { enabled: false },
	curseforgeRedirect: { enabled: false },
	accentColor: { enabled: false, color: '#1bd96a' },
	telemetry: { enabled: true },
}

type SettingKeys = { [K in keyof ExtensionSettings]?: (keyof ExtensionSettings[K])[] }

// Settings that must never be logged or sent with telemetry
export const SECRET_SETTINGS: SettingKeys = {
	reviews: ['moddexApiToken'],
}

// Copy that is safe to log or send, without secrets and without keys from older versions.
export function withoutSecrets(
	settings: ExtensionSettings,
): Record<string, Record<string, unknown>> {
	const safe: Record<string, Record<string, unknown>> = {}
	for (const key of Object.keys(DEFAULTS) as (keyof ExtensionSettings)[]) {
		const secrets: string[] = SECRET_SETTINGS[key] ?? []
		const values = settings[key] as unknown as Record<string, unknown>
		safe[key] = {}
		for (const subKey of Object.keys(DEFAULTS[key])) {
			if (!secrets.includes(subKey)) safe[key][subKey] = values[subKey]
		}
	}
	return safe
}

function hasUnknownKeys(base: object, value: object): boolean {
	return Object.entries(value).some(([key, val]) => {
		if (!(key in base)) return true
		const baseVal = (base as Record<string, unknown>)[key]
		return (
			val !== null &&
			typeof val === 'object' &&
			baseVal !== null &&
			typeof baseVal === 'object' &&
			hasUnknownKeys(baseVal, val)
		)
	})
}

const settingsItem = storage.defineItem<DeepPartial<ExtensionSettings>>('local:settings')

let cache: ExtensionSettings = structuredClone(DEFAULTS)
let init: Promise<void> | null = null

function startInit(): Promise<void> {
	if (init) return init
	init = (async () => {
		const data = await settingsItem.getValue()
		cache = deepMerge(DEFAULTS, data ?? {})
		// Old versions can leave secrets like API tokens behind under keys nothing reads anymore.
		if (data && hasUnknownKeys(DEFAULTS, data)) await settingsItem.setValue(cache)
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
