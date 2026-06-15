import {
	createMessageCompiler,
	type CrowdinMessages,
	I18N_INJECTION_KEY,
	type I18nContext,
	transformCrowdinMessages,
} from '@modrinth/ui'
import type { App } from 'vue'
import { createI18n } from 'vue-i18n'

import { LOCALES } from './locales'
import { getSettings } from './settings'

const LOCALE_CODES = new Set(LOCALES.map((l) => l.code))

const localeModules = import.meta.glob<{ default: CrowdinMessages }>('../locales/*/*.json', {
	eager: true,
})

function buildMessages(): Record<string, Record<string, string>> {
	const messages: Record<string, Record<string, string>> = {}
	for (const [path, module] of Object.entries(localeModules)) {
		const match = path.match(/\/([^/]+)\/[^/]+\.json$/)
		if (match && LOCALE_CODES.has(match[1])) {
			const locale = match[1]
			if (!messages[locale]) messages[locale] = {}
			Object.assign(messages[locale], transformCrowdinMessages(module.default))
		}
	}
	return messages
}

export const i18n = createI18n({
	legacy: false,
	locale: 'en-US',
	fallbackLocale: 'en-US',
	messageCompiler: createMessageCompiler(),
	missingWarn: false,
	fallbackWarn: false,
	messages: buildMessages(),
})

export function detectBrowserLocale(): string {
	const langs = navigator.languages?.length ? navigator.languages : [navigator.language]
	for (const lang of langs) {
		const exact = LOCALES.find((l) => l.code.toLowerCase() === lang.toLowerCase())
		if (exact) return exact.code
		const prefix = lang.split('-')[0].toLowerCase()
		const match = LOCALES.find((l) => l.code.split('-')[0].toLowerCase() === prefix)
		if (match) return match.code
	}
	return 'en-US'
}

export async function loadSavedLocale(): Promise<void> {
	try {
		const settings = await getSettings()
		i18n.global.locale.value = settings.locale?.value || detectBrowserLocale()
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load saved locale:', err)
	}
}

export function installI18n(app: App): void {
	app.use(i18n)

	const context: I18nContext = {
		// eslint-disable-next-line @typescript-eslint/no-explicit-any
		locale: i18n.global.locale as any,
		t: (key, values) => i18n.global.t(key, values ?? {}) as string,
		setLocale: (newLocale) => {
			i18n.global.locale.value = newLocale
		},
	}

	app.provide(I18N_INJECTION_KEY, context)
}
