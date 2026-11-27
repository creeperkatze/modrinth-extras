import { ref } from 'vue'
import { browser } from 'wxt/browser'

import { detectBrowserLocale, i18n } from '../../../core/i18n/i18n'
import {
	clearSettings,
	DEFAULTS,
	type ExtensionSettings,
	saveSettings,
} from '../../../core/settings'
import { loadSettingsStore, useSettings } from '../../../core/settings-store'
import { setTelemetryEnabled } from '../../../core/telemetry'
import {
	type QuickActionProfile,
	quickActionProfiles,
} from '../../../features/quick-actions/profiles'
import { themeLibrary } from '../../../features/themes/library'

export type FeatureKey = Exclude<keyof ExtensionSettings, 'locale' | 'sidebarLayout'>

// The popup edits the store directly and saves it, so it doesn't follow storage itself
export const settings = useSettings()
export const settingsLoaded = ref(false)
export const firefoxControlsTelemetry = ref(false)

const profiles = quickActionProfiles.state

export async function loadPopupSettings() {
	const [loaded] = await Promise.all([
		loadSettingsStore(),
		themeLibrary.load(),
		quickActionProfiles.load(),
	])
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
}

export async function updateEnabled(key: FeatureKey, enabled: boolean) {
	// Firefox only shows the permission prompt if nothing was awaited since the click
	if (key === 'desktopNotifications' && enabled) {
		const granted = await browser.permissions.request({ permissions: ['notifications'] })
		if (!granted) return
	}
	settings[key].enabled = enabled
	await saveSettings(settings as ExtensionSettings)
	if (key === 'telemetry') setTelemetryEnabled(enabled)
}

let pendingSave: ReturnType<typeof setTimeout> | undefined

function flushPendingSave() {
	if (!pendingSave) return
	clearTimeout(pendingSave)
	pendingSave = undefined
	Promise.all([saveSettings(settings as ExtensionSettings), quickActionProfiles.save()]).catch(
		(err) => console.error('[Modrinth Extras] Failed to save settings:', err),
	)
}

// Sync storage allows two writes a second
function scheduleSave() {
	pendingSave ??= setTimeout(flushPendingSave, 500)
}

export function updateOption(
	featureKey: keyof ExtensionSettings,
	optionKey: string,
	value: string | boolean,
) {
	;(settings[featureKey] as Record<string, unknown>)[optionKey] = value
	// Changing a download option while a profile is picked edits that profile
	if (featureKey === 'projectCardActions') {
		const profile = selectedQuickActionProfile()
		if (profile) (profile as unknown as Record<string, unknown>)[optionKey] = value
	}
	scheduleSave()
}

export function selectedQuickActionProfile(): QuickActionProfile | undefined {
	return profiles.items.find((profile) => profile.id === profiles.selected)
}

export function selectQuickActionProfile(id: string) {
	const profile = profiles.items.find((p) => p.id === id)
	profiles.selected = profile?.id ?? ''
	if (profile) {
		const { id: _id, name: _name, ...downloadSettings } = profile
		Object.assign(settings.projectCardActions, downloadSettings)
	}
	scheduleSave()
}

export function createQuickActionProfile(name: string): string {
	const { enabled: _enabled, ...downloadSettings } = settings.projectCardActions
	const id = `profile-${crypto.randomUUID()}`
	profiles.items.push({ ...downloadSettings, id, name })
	profiles.selected = id
	scheduleSave()
	return id
}

export function renameQuickActionProfile(id: string, name: string) {
	const profile = profiles.items.find((p) => p.id === id)
	if (!profile) return
	profile.name = name
	scheduleSave()
}

// Deleting the picked profile picks its neighbour, so one stays picked while any are left
export function deleteQuickActionProfile(id: string) {
	const index = profiles.items.findIndex((profile) => profile.id === id)
	if (index === -1) return
	profiles.items.splice(index, 1)
	if (profiles.selected !== id) return scheduleSave()
	const next = profiles.items[Math.min(index, profiles.items.length - 1)]
	selectQuickActionProfile(next?.id ?? '')
}

window.addEventListener('pagehide', flushPendingSave)

export async function updateLocale(value: string) {
	settings.locale.value = value
	await saveSettings(settings as ExtensionSettings)
	i18n.global.locale.value = value
}

export async function resetSettings() {
	clearTimeout(pendingSave)
	pendingSave = undefined
	// Custom themes and profiles go too, as the confirmation says
	await Promise.all([clearSettings(), themeLibrary.clear(), quickActionProfiles.clear()])
	Object.assign(settings, structuredClone(DEFAULTS))
	i18n.global.locale.value = detectBrowserLocale()
	setTelemetryEnabled(settings.telemetry.enabled && !firefoxControlsTelemetry.value)
}
