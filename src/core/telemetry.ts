import { createAnalytics } from '@wxt-dev/analytics'
import { posthog } from '@wxt-dev/analytics/providers/posthog'
import { browser } from 'wxt/browser'

import { detectBrowserLocale } from './i18n/i18n'
import { type ExtensionSettings, getSettings, withoutSecrets } from './settings'

export const analytics = createAnalytics({
	providers: [
		posthog({
			apiKey: 'phc_oWL7DUqxG3kmN20nWBkie7Eu7i3GJMdvGnvKRWBI7hi',
			apiHost: 'https://hedgehog.creeperkatze.dev',
		}),
	],
})

function flattenSettings(settings: ExtensionSettings): Record<string, string> {
	const flat: Record<string, string> = {}
	for (const [key, values] of Object.entries(withoutSecrets(settings))) {
		for (const [subKey, value] of Object.entries(values)) {
			flat[`${key}_${subKey}`] = String(value)
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
