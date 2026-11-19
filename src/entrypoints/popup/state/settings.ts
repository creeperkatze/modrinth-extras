import { reactive, ref } from 'vue'
import { browser } from 'wxt/browser'

import { detectBrowserLocale, i18n } from '../../../core/i18n/i18n'
import {
	clearSettings,
	DEFAULTS,
	type ExtensionSettings,
	getSettings,
	saveSettings,
} from '../../../core/settings'
import { setTelemetryEnabled } from '../../../core/telemetry'

export type FeatureKey = Exclude<keyof ExtensionSettings, 'locale' | 'sidebarLayout' | 'themes'>

// Shared by every popup view, so they all edit the same copy
export const settings = reactive(structuredClone(DEFAULTS))
export const settingsLoaded = ref(false)
export const firefoxControlsTelemetry = ref(false)

export async function loadPopupSettings() {
	const loaded = await getSettings()
	Object.assign(settings, loaded)
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

// Dragging the color picker fires an update per frame, so batch the storage writes
export function updateOption(
	featureKey: keyof ExtensionSettings,
	optionKey: string,
	value: string | boolean,
) {
	;(settings[featureKey] as Record<string, unknown>)[optionKey] = value
	pendingSave ??= setTimeout(flushPendingSave, 100)
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
