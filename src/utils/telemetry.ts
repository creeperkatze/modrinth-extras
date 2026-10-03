import { createAnalytics } from '@wxt-dev/analytics'
import { posthog } from '@wxt-dev/analytics/providers/posthog'
import { browser } from 'wxt/browser'

import { detectBrowserLocale } from './i18n'
import { DEFAULTS, type ExtensionSettings, getSettings, TELEMETRY_EXCLUDED } from './settings'

export const analytics = createAnalytics({
	providers: [
		posthog({
			apiKey: 'phc_oWL7DUqxG3kmN20nWBkie7Eu7i3GJMdvGnvKRWBI7hi',
			apiHost: 'https://hedgehog.creeperkatze.dev',
		}),
	],
})

// Only known settings are sent, since storage can still hold keys from older versions.
function flattenSettings(settings: ExtensionSettings): Record<string, string> {
	const flat: Record<string, string> = {}
	for (const key of Object.keys(DEFAULTS) as (keyof ExtensionSettings)[]) {
		const excluded: string[] = TELEMETRY_EXCLUDED[key] ?? []
		const values = settings[key] as unknown as Record<string, unknown>
		for (const subKey of Object.keys(DEFAULTS[key])) {
			if (excluded.includes(subKey)) continue
			flat[`${key}_${subKey}`] = String(values[subKey])
		}
	}
	return flat
}

export async function initTelemetry(): Promise<void> {
	const settings = await getSettings()
	let telemetryEnabled = settings.telemetry.enabled

	if (telemetryEnabled) {
		// On Firefox, respect the built-in data collection consent experience
		const perms = await browser.permissions.getAll()
		if ('data_collection' in perms) {
			const granted = (perms as unknown as { data_collection: string[] }).data_collection
			telemetryEnabled = granted.includes('technicalAndInteraction')
		}
	}

	await analytics.setEnabled(telemetryEnabled)
	await analytics.track('extension_started', {
		...flattenSettings(settings),
		locale: settings.locale.value || detectBrowserLocale(),
	})
}

export async function setTelemetryEnabled(value: boolean): Promise<void> {
	await analytics.setEnabled(value)
}
