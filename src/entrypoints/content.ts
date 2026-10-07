import '../assets/tailwind.css'

import { browser } from 'wxt/browser'

import { pageState, remountForChangedSettings } from '../content/injection'
import { headerInjections } from '../content/injections/header'
import { projectInjections } from '../content/injections/project'
import { searchInjections } from '../content/injections/search'
import { sidebarInjections } from '../content/injections/sidebar'
import { siteInjections } from '../content/injections/site'
import { getProjectSlug } from '../content/page'
import { navigate } from '../content/page-router'
import { detectBrowserLocale, i18n, loadSavedLocale } from '../core/i18n/i18n'
import { DEFAULTS, type ExtensionSettings, getSettings, withoutSecrets } from '../core/settings'
import { applyAccentColor } from '../features/accent-color/apply'
import { recolorBrandImages } from '../features/accent-color/images'

export default defineContentScript({
	matches: ['https://modrinth.com/*'],
	cssInjectionMode: 'manifest',

	main(ctx) {
		console.log('[Modrinth Extras] Content script loaded')
		loadSavedLocale().catch(() => {})
		let settings: ExtensionSettings = { ...DEFAULTS }
		const getCurrentSettings = () => settings

		const injections = [
			...headerInjections(getCurrentSettings),
			...sidebarInjections(getCurrentSettings),
			...projectInjections(getCurrentSettings),
			...siteInjections(),
			...searchInjections(getCurrentSettings),
		]

		function markHydrated() {
			if (pageState.hydrated) return
			pageState.hydrated = true
			for (const inj of injections) inj.schedule()
		}

		ctx.addEventListener(window, 'modrinth-extras:router-ready', markHydrated, { once: true })

		function onRuntimeMessage(message: { type?: string; path?: string }) {
			if (message.type === 'navigate') navigate(message.path as string)
		}
		browser.runtime.onMessage.addListener(onRuntimeMessage)
		ctx.onInvalidated(() => browser.runtime.onMessage.removeListener(onRuntimeMessage))

		getSettings().then((s) => {
			if (ctx.isInvalid) return
			settings = s
			console.log('[Modrinth Extras] Settings loaded:', JSON.stringify(withoutSecrets(s)))
			applyAccentColor(settings)
			for (const inj of injections) {
				if (inj.config.settingsKeys.length > 0) inj.unmount()
				inj.schedule()
			}
		})

		function onStorageChanged(changes: Record<string, { oldValue?: unknown; newValue?: unknown }>) {
			if (!('settings' in changes)) return
			const oldSettings = changes['settings']?.oldValue as ExtensionSettings | undefined
			const newSettings = changes['settings']?.newValue as ExtensionSettings | undefined
			Object.assign(settings, newSettings ?? {})
			const newLocale = newSettings?.locale?.value
			i18n.global.locale.value = newLocale || detectBrowserLocale()
			applyAccentColor(settings)
			remountForChangedSettings(injections, oldSettings, newSettings)
		}
		browser.storage.onChanged.addListener(onStorageChanged)
		ctx.onInvalidated(() => browser.storage.onChanged.removeListener(onStorageChanged))

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

		// A newer instance of this content script has taken over, for example after an extension
		// update while this tab stayed open. Our injected UI is removed so it doesn't linger.
		ctx.onInvalidated(() => {
			for (const inj of injections) inj.unmount()
		})
	},
})
