import { storage } from '@wxt-dev/storage'

type DeepPartial<T> = {
	[P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P]
}

function isPlainObject(value: unknown): value is object {
	return value != null && typeof value === 'object' && !Array.isArray(value)
}

// Keys missing from base are dropped, so settings removed in older versions don't linger.
// Arrays are values, not objects to merge into.
// Cloned so edits to the result never leak into DEFAULTS.
function deepMerge<T extends object>(base: T, override: DeepPartial<T>): T {
	const result = structuredClone(base)
	for (const key of Object.keys(override) as (keyof T)[]) {
		if (!(key in base)) continue
		const baseVal = base[key]
		const overrideVal = override[key]
		if (isPlainObject(baseVal) && overrideVal != null && typeof overrideVal === 'object') {
			result[key] = deepMerge(baseVal as object, overrideVal as object) as T[typeof key]
		} else if (overrideVal !== undefined) {
			result[key] = overrideVal as T[typeof key]
		}
	}
	return result
}

export interface QuickDownloadSettings {
	modLoader: string
	pluginLoader: string
	shaderLoader: string
	gameVersion: string
	downloadDependencies: boolean
}

export interface ExtensionSettings {
	locale: { value: string }
	notificationsIndicator: { enabled: boolean }
	quickSearch: { enabled: boolean }
	projectCardActions: { enabled: boolean } & QuickDownloadSettings
	activitySparkline: { enabled: boolean; days: string }
	toolsSidebar: { enabled: boolean; modManager: string; decompiler: string }
	compareVersions: { enabled: boolean }
	collectionDownload: { enabled: boolean }
	sidebarLayout: { order: string[] }
	dependencySidebar: { enabled: boolean }
	dependencyExplorer: { enabled: boolean }
	githubSidebar: { enabled: boolean }
	discordSidebar: { enabled: boolean }
	modpacksSidebar: { enabled: boolean }
	platformsSidebar: { enabled: boolean }
	modgradeSidebar: { enabled: boolean }
	galleryBackground: { enabled: boolean }
	monetizationBadge: { enabled: boolean }
	translateDescription: { enabled: boolean }
	reviews: { enabled: boolean; moddex: boolean; curseforge: boolean; spigot: boolean }
	notificationBadge: { enabled: boolean }
	desktopNotifications: { enabled: boolean }
	curseforgeRedirect: { enabled: boolean }
	themes: { enabled: boolean; presets: boolean; customAccent: boolean; accentColor: string }
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
	toolsSidebar: { enabled: true, modManager: 'packwiz', decompiler: 'slicer' },
	compareVersions: { enabled: false },
	collectionDownload: { enabled: true },
	sidebarLayout: { order: [] },
	dependencySidebar: { enabled: true },
	dependencyExplorer: { enabled: true },
	githubSidebar: { enabled: true },
	discordSidebar: { enabled: true },
	modpacksSidebar: { enabled: true },
	platformsSidebar: { enabled: false },
	modgradeSidebar: { enabled: false },
	galleryBackground: { enabled: true },
	monetizationBadge: { enabled: true },
	translateDescription: { enabled: false },
	reviews: { enabled: true, moddex: true, curseforge: true, spigot: true },
	notificationBadge: { enabled: true },
	desktopNotifications: { enabled: false },
	curseforgeRedirect: { enabled: false },
	themes: { enabled: true, presets: true, customAccent: false, accentColor: '#1bd96a' },
	telemetry: { enabled: true },
}

type SettingKeys = { [K in keyof ExtensionSettings]?: (keyof ExtensionSettings[K])[] }

// Settings that must never be logged or sent with telemetry
export const SECRET_SETTINGS: SettingKeys = {}

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

// Keeps keys from a newer version on another device
function keepUnknown(stored: object, value: object): object {
	const result = { ...stored } as Record<string, unknown>
	for (const [key, val] of Object.entries(value)) {
		const prev = result[key]
		result[key] = isPlainObject(prev) && isPlainObject(val) ? keepUnknown(prev, val) : val
	}
	return result
}

// Tied to this browser
const LOCAL_SETTINGS: (keyof ExtensionSettings)[] = ['desktopNotifications']

type StoredSettings = Record<string, Record<string, unknown> | undefined>

function split(settings: object): { synced: StoredSettings; local: StoredSettings } {
	const synced: StoredSettings = {}
	const local: StoredSettings = {}
	for (const [key, value] of Object.entries(settings)) {
		if (LOCAL_SETTINGS.includes(key as keyof ExtensionSettings)) local[key] = value
		else synced[key] = value
	}
	return { synced, local }
}

const syncedItem = storage.defineItem<StoredSettings>('sync:settings')

const localItem = storage.defineItem<StoredSettings>('local:settings', {
	version: 2,
	migrations: {
		// Moves settings to sync and the accent color into themes
		2: async ({ accentColor, ...value }: StoredSettings) => {
			const themes = {
				...value.themes,
				customAccent: accentColor?.enabled,
				accentColor: accentColor?.color,
			}
			// Drops old keys that may hold secrets
			const { synced, local } = split(
				deepMerge(DEFAULTS, { ...value, themes } as DeepPartial<ExtensionSettings>),
			)
			// Another browser may have moved its settings first
			if (!(await syncedItem.getValue())) await syncedItem.setValue(synced)
			return local
		},
	},
})

let stored: { synced: StoredSettings; local: StoredSettings } = { synced: {}, local: {} }
let cache: ExtensionSettings = structuredClone(DEFAULTS)
let init: Promise<void> | null = null
const listeners = new Set<(settings: ExtensionSettings) => void>()

function mergeStored(): ExtensionSettings {
	return deepMerge(DEFAULTS, {
		...stored.synced,
		...stored.local,
	} as DeepPartial<ExtensionSettings>)
}

function onStoredChange() {
	cache = mergeStored()
	for (const listener of listeners) listener(cache)
}

function startInit(): Promise<void> {
	init ??= (async () => {
		// Local first, since its migration fills sync storage
		const local = (await localItem.getValue()) ?? {}
		stored = { synced: (await syncedItem.getValue()) ?? {}, local }
		cache = mergeStored()
		syncedItem.watch((value) => {
			stored.synced = value ?? {}
			onStoredChange()
		})
		localItem.watch((value) => {
			stored.local = value ?? {}
			onStoredChange()
		})
	})()
	return init
}

export async function getSettings(): Promise<ExtensionSettings> {
	await startInit()
	return cache
}

export function watchSettings(callback: (settings: ExtensionSettings) => void): () => void {
	listeners.add(callback)
	void startInit()
	return () => {
		listeners.delete(callback)
	}
}

export async function clearSettings(): Promise<void> {
	stored = { synced: {}, local: {} }
	cache = structuredClone(DEFAULTS)
	await Promise.all([syncedItem.removeValue(), localItem.removeValue()])
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
	await startInit()
	// Firefox's structured clone doesn't support Vue reactive proxies, serialize first.
	const plain = JSON.parse(JSON.stringify(settings)) as ExtensionSettings
	const next = split(plain)
	const current = split(cache)
	// Sync storage limits writes per minute
	const writes: Promise<void>[] = []
	if (JSON.stringify(next.synced) !== JSON.stringify(current.synced)) {
		stored.synced = keepUnknown(stored.synced, next.synced) as StoredSettings
		writes.push(syncedItem.setValue(stored.synced))
	}
	if (JSON.stringify(next.local) !== JSON.stringify(current.local)) {
		stored.local = next.local
		writes.push(localItem.setValue(stored.local))
	}
	cache = plain
	await Promise.all(writes)
}
