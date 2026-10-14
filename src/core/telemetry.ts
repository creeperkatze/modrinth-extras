import { createAnalytics } from '@wxt-dev/analytics'
import { posthog } from '@wxt-dev/analytics/providers/posthog'
import type { App } from 'vue'
import { browser } from 'wxt/browser'

import { detectBrowserLocale } from './i18n/i18n'
import { type ExtensionSettings, getSettings, withoutSecrets } from './settings'

export const analytics = createAnalytics({
	providers: [
		posthog({
			apiKey: 'phc_oWL7DUqxG3kmN20nWBkie7Eu7i3GJMdvGnvKRWBI7hi',
			apiHost: 'https://hedgehog.creeperkatze.dev',
			errorTracking: true,
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
}

export async function trackExtensionStarted(): Promise<void> {
	const settings = await getSettings()
	await analytics.track('extension_started', {
		...flattenSettings(settings),
		locale: settings.locale.value || detectBrowserLocale(),
	})
}

export async function setTelemetryEnabled(value: boolean): Promise<void> {
	await analytics.setEnabled(value)
}

export interface SerializedError {
	name: string
	message: string
	stack: string | undefined
}

function serializeError(error: unknown): SerializedError {
	if (error instanceof Error) {
		return { name: error.name, message: error.message, stack: error.stack }
	}
	return { name: 'Error', message: String(error), stack: undefined }
}

// Reports through the background so the current page URL is never attached
export function reportError(error: unknown, properties?: Record<string, string | undefined>): void {
	browser.runtime
		.sendMessage({ type: 'capture-exception', error: serializeError(error), properties })
		.catch(() => {})
}

export function installErrorReporting(app: App): void {
	app.config.errorHandler = (error, instance, info) => {
		const component = instance?.$options.__name ?? instance?.$options.name
		console.error(`[Modrinth Extras] Failed to run ${component ?? 'component'}:`, error)
		reportError(error, { component, vue_info: info })
	}
}

// Content scripts share the window with the page, so only errors thrown by extension code are reported
export function reportUncaughtErrors(): void {
	const extensionUrl = browser.runtime.getURL('/')
	window.addEventListener('error', (event) => {
		if (event.filename?.startsWith(extensionUrl)) reportError(event.error ?? event.message)
	})
	window.addEventListener('unhandledrejection', (event) => {
		const stack = (event.reason as { stack?: unknown } | null)?.stack
		if (typeof stack === 'string' && stack.includes(extensionUrl)) reportError(event.reason)
	})
}
