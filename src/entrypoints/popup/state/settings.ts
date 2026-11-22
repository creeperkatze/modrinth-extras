import { ref } from 'vue'
import { browser } from 'wxt/browser'

import { detectBrowserLocale, i18n } from '../../../core/i18n/i18n'
import {
	type QuickActionProfile,
	clearSettings,
	DEFAULTS,
	type ExtensionSettings,
	saveSettings,
} from '../../../core/settings'
import { loadSettingsStore, useSettings } from '../../../core/settings-store'
import { setTelemetryEnabled } from '../../../core/telemetry'

export type FeatureKey = Exclude<
	keyof ExtensionSettings,
	'locale' | 'sidebarLayout' | 'themeLibrary' | 'quickActionProfiles'
>

// The popup edits the store directly and saves it, so it doesn't follow storage itself
export const settings = useSettings()
export const settingsLoaded = ref(false)
export const firefoxControlsTelemetry = ref(false)

export async function loadPopupSettings() {
	const loaded = await loadSettingsStore()
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
	saveSettings(settings as ExtensionSettings).catch((err) =>
		console.error('[Modrinth Extras] Failed to save settings:', err),
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
	const { selected, profiles } = settings.quickActionProfiles
	return profiles.find((profile) => profile.id === selected)
}

export function selectQuickActionProfile(id: string) {
	const profile = settings.quickActionProfiles.profiles.find((p) => p.id === id)
	settings.quickActionProfiles.selected = profile?.id ?? ''
	if (profile) {
		const { id: _id, name: _name, ...downloadSettings } = profile
		Object.assign(settings.projectCardActions, downloadSettings)
	}
	scheduleSave()
}

// Starts from the options in use, so saving what is set up now is one click
export function createQuickActionProfile(name: string): string {
	const { enabled: _enabled, ...downloadSettings } = settings.projectCardActions
	const id = `profile-${crypto.randomUUID()}`
	settings.quickActionProfiles.profiles.push({ ...downloadSettings, id, name })
	settings.quickActionProfiles.selected = id
	scheduleSave()
	return id
}

export function renameQuickActionProfile(id: string, name: string) {
	const profile = settings.quickActionProfiles.profiles.find((p) => p.id === id)
	if (!profile) return
	profile.name = name
	scheduleSave()
}

// The options stay as they are, only the profile is gone
export function deleteQuickActionProfile(id: string) {
	const { profiles, selected } = settings.quickActionProfiles
	settings.quickActionProfiles.profiles = profiles.filter((profile) => profile.id !== id)
	if (selected === id) settings.quickActionProfiles.selected = ''
	scheduleSave()
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
	await clearSettings()
	Object.assign(settings, structuredClone(DEFAULTS))
	i18n.global.locale.value = detectBrowserLocale()
	setTelemetryEnabled(settings.telemetry.enabled && !firefoxControlsTelemetry.value)
}
