import '../assets/tailwind.css'

import { watch } from 'vue'
import { browser } from 'wxt/browser'

import { pageState } from '../content/injection'
import { collectionInjections } from '../content/injections/collection'
import { headerInjections } from '../content/injections/header'
import { projectInjections } from '../content/injections/project'
import { searchInjections } from '../content/injections/search'
import { settingsInjections } from '../content/injections/settings'
import { sidebarInjections } from '../content/injections/sidebar'
import { siteInjections } from '../content/injections/site'
import { applySidebarOrder, getProjectSlug } from '../content/page'
import { navigate } from '../content/page-router'
import { detectBrowserLocale, i18n, loadSavedLocale } from '../core/i18n/i18n'
import { withoutSecrets } from '../core/settings'
import { followSettingsChanges, loadSettingsStore, useSettings } from '../core/settings-store'
import { reportUncaughtErrors } from '../core/telemetry'
import { applyAccentColor } from '../features/accent-color/apply'
import { recolorBrandImages } from '../features/accent-color/images'
import { sidebarOrder } from '../features/sidebar-layout/order'
import { themeLibrary } from '../features/themes/library'
import { applyThemeSettings } from '../features/themes/themes'

export default defineContentScript({
	matches: ['https://modrinth.com/*'],
	cssInjectionMode: 'manifest',

	main(ctx) {
		console.log('[Modrinth Extras] Content script loaded')
		reportUncaughtErrors()
		loadSavedLocale().catch(() => {})
		const settings = useSettings()
		const getCurrentSettings = () => settings

		const injections = [
			...headerInjections(getCurrentSettings),
			...sidebarInjections(getCurrentSettings),
			...projectInjections(getCurrentSettings),
			...siteInjections(),
			...searchInjections(getCurrentSettings),
			...settingsInjections(getCurrentSettings),
			...collectionInjections(getCurrentSettings),
		]

		function markHydrated() {
			if (pageState.hydrated) return
			pageState.hydrated = true
			for (const inj of injections) inj.schedule()
		}

		ctx.addEventListener(window, 'modrinth-extras:router-ready', markHydrated, { once: true })

		// Answers so the popup knows the page handled it and doesn't open a new tab
		function onRuntimeMessage(
			message: { type?: string; path?: string },
			_sender: unknown,
			sendResponse: (response: { ok: boolean }) => void,
		) {
			if (message.type !== 'navigate') return
			navigate(message.path as string)
			sendResponse({ ok: true })
		}
		browser.runtime.onMessage.addListener(onRuntimeMessage)
		ctx.onInvalidated(() => browser.runtime.onMessage.removeListener(onRuntimeMessage))

		// Mounted components follow the store themselves, so only turned on or off ones change here
		function applySettings() {
			applyAccentColor(settings)
			applyThemeSettings(settings, themeLibrary.state)
			for (const inj of injections) inj.refresh()
		}

		Promise.all([loadSettingsStore(), themeLibrary.load()]).then(() => {
			if (ctx.isInvalid) return
			console.log('[Modrinth Extras] Settings loaded:', JSON.stringify(withoutSecrets(settings)))
			applySettings()
		})

		const stopFollowingThemes = watch(
			themeLibrary.state,
			() => applyThemeSettings(settings, themeLibrary.state),
			{ deep: true },
		)
		ctx.onInvalidated(stopFollowingThemes)

		const stopFollowingSettings = followSettingsChanges(() => {
			i18n.global.locale.value = settings.locale.value || detectBrowserLocale()
			applySettings()
			applySidebarOrder(sidebarOrder(settings))
		})
		ctx.onInvalidated(stopFollowingSettings)

		let prevProjectSlug: string | null = null
		const prevScopeKeys = new Map<string, string>()

		ctx.addEventListener(window, 'modrinth-extras:before-navigate', () => {
			pageState.navigating = true
			prevProjectSlug = getProjectSlug()
			for (const inj of injections) {
				if (inj.config.persistent) continue
				if (inj.config.projectScoped) {
					if (inj.config.scopeKey && inj.config.id)
						prevScopeKeys.set(inj.config.id, inj.config.scopeKey())
					continue
				}
				inj.unmount()
			}
		})

		ctx.addEventListener(window, 'modrinth-extras:after-navigate', () => {
			pageState.navigating = false
			const newSlug = getProjectSlug()
			const projectChanged = prevProjectSlug !== newSlug
			for (const inj of injections) {
				if (inj.config.projectScoped) {
					if (projectChanged) {
						inj.unmount()
					} else if (inj.config.scopeKey) {
						const prev = inj.config.id ? prevScopeKeys.get(inj.config.id) : undefined
						if (prev !== inj.config.scopeKey()) inj.unmount()
					}
				}
				inj.schedule()
			}
			prevScopeKeys.clear()
		})

		const domObserver = new MutationObserver(() => {
			recolorBrandImages()
			for (const inj of injections) {
				inj.checkDetached()
				inj.schedule()
			}
		})
		domObserver.observe(document.documentElement, { childList: true, subtree: true })
		ctx.onInvalidated(() => domObserver.disconnect())

		// A newer copy of this script took over, like after an update, so our UI is removed
		ctx.onInvalidated(() => {
			for (const inj of injections) inj.unmount()
		})
	},
})
