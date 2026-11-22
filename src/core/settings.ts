import { storage } from '@wxt-dev/storage'
import { browser } from 'wxt/browser'

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

// Every color of a theme, from the page background to the accent
export interface ThemeColors {
	// The Modrinth theme it is drawn on top of
	base: 'light' | 'dark'
	// From the page background to borders, like Modrinth's surface-1 to surface-5
	surfaces: [string, string, string, string, string, string, string]
	text: { primary: string; default: string; tertiary: string }
	divider: string
	accent: string
	accentContrast: string
	// Green follows the accent, since Modrinth uses green as its brand color
	colors: { red: string; orange: string; blue: string; purple: string }
}

export interface NamedTheme extends ThemeColors {
	id: string
	name: string
}

// What the quick actions download button looks for
export interface QuickDownloadSettings {
	modLoader: string
	pluginLoader: string
	shaderLoader: string
	gameVersion: string
	downloadDependencies: boolean
}

export interface QuickActionProfile extends QuickDownloadSettings {
	id: string
	name: string
}

export interface ExtensionSettings {
	locale: { value: string }
	notificationsIndicator: { enabled: boolean }
	quickSearch: { enabled: boolean }
	projectCardActions: { enabled: boolean } & QuickDownloadSettings
	// Kept apart, so renaming a profile doesn't remount every quick actions bar
	quickActionProfiles: { selected: string; profiles: QuickActionProfile[] }
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
	// Kept apart from the toggle, so picking or editing a theme doesn't remount the theme picker
	themeLibrary: { selected: string; custom: NamedTheme[] }
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
	quickActionProfiles: { selected: '', profiles: [] },
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
	themeLibrary: { selected: '', custom: [] },
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

function hasUnknownKeys(base: object, value: object): boolean {
	return Object.entries(value).some(([key, val]) => {
		if (!(key in base)) return true
		const baseVal = (base as Record<string, unknown>)[key]
		return isPlainObject(val) && isPlainObject(baseVal) && hasUnknownKeys(baseVal, val)
	})
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

export const MAX_CUSTOM_THEMES = 50
export const MAX_QUICK_ACTION_PROFILES = 20

// Synced as a list of ids, with each entry in its own item to stay under 8 KB per item
const LISTS = [
	{ setting: 'themeLibrary', field: 'custom', prefix: 'theme:', max: MAX_CUSTOM_THEMES },
	{
		setting: 'quickActionProfiles',
		field: 'profiles',
		prefix: 'profile:',
		max: MAX_QUICK_ACTION_PROFILES,
	},
] as const

type SyncedList = (typeof LISTS)[number]

interface Entry {
	id: string
}

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

function entries(settings: StoredSettings, list: SyncedList): Entry[] {
	const value = settings[list.setting]?.[list.field]
	return Array.isArray(value) ? (value as Entry[]) : []
}

function entryKey(list: SyncedList, id: string): `sync:${string}` {
	return `sync:${list.prefix}${id}`
}

function withIds(settings: StoredSettings): StoredSettings {
	const result = { ...settings }
	for (const list of LISTS) {
		const ids = entries(settings, list).map((entry) => entry.id)
		result[list.setting] = { ...settings[list.setting], [list.field]: ids }
	}
	return result
}

const syncedItem = storage.defineItem<StoredSettings>('sync:settings')

async function readSynced(): Promise<StoredSettings | null> {
	const value = await syncedItem.getValue()
	if (!value) return null
	const result = { ...value }
	for (const list of LISTS) {
		const ids = value[list.setting]?.[list.field]
		if (!Array.isArray(ids)) continue
		const items = await storage.getItems(ids.map((id: string) => entryKey(list, id)))
		const byKey = new Map(items.map((item) => [item.key, item.value as Entry | null]))
		const found = ids.map((id: string) => byKey.get(entryKey(list, id))).filter(Boolean)
		result[list.setting] = { ...value[list.setting], [list.field]: found }
	}
	return result
}

// Only entries that changed are written
async function writeSynced(next: StoredSettings, prev: StoredSettings): Promise<void> {
	const set: { key: `sync:${string}`; value: unknown }[] = []
	const remove: `sync:${string}`[] = []
	for (const list of LISTS) {
		const before = new Map(entries(prev, list).map((entry) => [entry.id, JSON.stringify(entry)]))
		for (const entry of entries(next, list)) {
			if (before.get(entry.id) !== JSON.stringify(entry)) {
				set.push({ key: entryKey(list, entry.id), value: entry })
			}
			before.delete(entry.id)
		}
		for (const id of before.keys()) remove.push(entryKey(list, id))
	}
	const settings = withIds(next)
	if (JSON.stringify(settings) !== JSON.stringify(withIds(prev))) {
		set.push({ key: 'sync:settings', value: settings })
	}
	if (set.length) await storage.setItems(set)
	if (remove.length) await storage.removeItems(remove)
}

// Adds this browser's themes and profiles to the ones another browser synced
function joinLists(synced: StoredSettings, old: StoredSettings): StoredSettings {
	const joined: StoredSettings = {}
	for (const list of LISTS) {
		const kept = entries(synced, list)
		const ids = new Set(kept.map((entry) => entry.id))
		const added = entries(old, list).filter((entry) => !ids.has(entry.id))
		joined[list.setting] = { [list.field]: [...kept, ...added].slice(0, list.max) }
	}
	return joined
}

// Returns what stays local. Merging first drops keys nothing reads anymore.
async function moveToSync(value: StoredSettings): Promise<StoredSettings> {
	const old = split(deepMerge(DEFAULTS, value as DeepPartial<ExtensionSettings>))
	const synced = await readSynced()
	const next = synced
		? (keepUnknown(synced, joinLists(synced, old.synced)) as StoredSettings)
		: old.synced
	await writeSynced(next, synced ?? {})
	return old.local
}

const localItem = storage.defineItem<StoredSettings>('local:settings', {
	version: 3,
	migrations: {
		// The accent color moved from its own feature into themes
		2: (value: StoredSettings) => {
			const { accentColor, ...rest } = value
			if (!accentColor) return rest
			const themes = { ...rest.themes }
			if (typeof accentColor.enabled === 'boolean') themes.customAccent = accentColor.enabled
			if (typeof accentColor.color === 'string') themes.accentColor = accentColor.color
			return { ...rest, themes }
		},
		3: moveToSync,
	},
})

let stored: { synced: StoredSettings; local: StoredSettings } = { synced: {}, local: {} }
let cache: ExtensionSettings = structuredClone(DEFAULTS)
let init: Promise<void> | null = null
let reloads = 0
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

async function reloadSynced() {
	const reload = ++reloads
	const synced = (await readSynced()) ?? {}
	if (reload !== reloads) return
	stored.synced = synced
	onStoredChange()
}

function isSyncedKey(key: string): boolean {
	return key === 'settings' || LISTS.some((list) => key.startsWith(list.prefix))
}

function startInit(): Promise<void> {
	init ??= (async () => {
		// Local first, so its migration has filled sync storage
		let local = (await localItem.getValue()) ?? {}
		// Old versions can leave synced settings here, or secrets under keys nothing reads anymore
		const misplaced = Object.keys(local).some(
			(key) => !LOCAL_SETTINGS.includes(key as keyof ExtensionSettings),
		)
		if (misplaced || hasUnknownKeys(DEFAULTS, local)) {
			local = await moveToSync(local)
			await localItem.setValue(local)
		}
		stored = { synced: (await readSynced()) ?? {}, local }
		cache = mergeStored()
		browser.storage.onChanged.addListener((changes, area) => {
			if (area === 'sync' && Object.keys(changes).some(isSyncedKey)) void reloadSynced()
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

// Returns a function that stops watching.
export function watchSettings(callback: (settings: ExtensionSettings) => void): () => void {
	listeners.add(callback)
	void startInit()
	return () => {
		listeners.delete(callback)
	}
}

// Every setting falls back to its default
export async function clearSettings(): Promise<void> {
	const prev = stored.synced
	stored = { synced: {}, local: {} }
	cache = structuredClone(DEFAULTS)
	await Promise.all([writeSynced({}, prev), localItem.removeValue()])
	await syncedItem.removeValue()
}

export async function saveSettings(settings: ExtensionSettings): Promise<void> {
	await startInit()
	// Firefox's structured clone doesn't support Vue reactive proxies, serialize first.
	const plain = JSON.parse(JSON.stringify(settings)) as ExtensionSettings
	const next = split(plain)
	const current = split(cache)
	const writes: Promise<void>[] = []
	if (JSON.stringify(next.synced) !== JSON.stringify(current.synced)) {
		const synced = keepUnknown(stored.synced, next.synced) as StoredSettings
		writes.push(writeSynced(synced, stored.synced))
		stored.synced = synced
	}
	if (JSON.stringify(next.local) !== JSON.stringify(current.local)) {
		stored.local = next.local
		writes.push(localItem.setValue(stored.local))
	}
	cache = plain
	await Promise.all(writes)
}
