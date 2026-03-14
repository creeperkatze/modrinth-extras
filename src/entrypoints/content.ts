import '../assets/tailwind.css'

import { provideI18n } from '@modrinth/ui'
import FloatingVue from 'floating-vue'
import { type App, createApp, h, ref } from 'vue'
import { browser } from 'wxt/browser'

import FooterBadge from '../components/FooterBadge.vue'
import NotificationsIndicator from '../components/NotificationsIndicator.vue'
import Sidebar from '../components/Sidebar.vue'
import { DEFAULTS, type ExtensionSettings, loadSettings } from '../helpers/settings'

// Debounce only during initial page load to avoid injecting during Nuxt
// hydration. Once the first successful injection happens, the page is
// considered hydrated and all further injections are immediate.
const HYDRATION_DEBOUNCE_MS = 200
let hydrated = false

interface InjectionConfig {
	id: string
	isEnabled: () => boolean
	settingsKeys: (keyof ExtensionSettings)[]
	attach: (container: HTMLElement) => boolean
	createApp: () => App
	persistent: boolean
}

function createInjection(config: InjectionConfig) {
	let container: HTMLElement | null = null
	let app: App | null = null
	let timer: ReturnType<typeof setTimeout> | null = null

	function unmount() {
		if (app) {
			app.unmount()
			app = null
		}
		if (container?.parentElement) {
			container.parentElement.removeChild(container)
		}
		container = null
	}

	function inject() {
		if (!config.isEnabled()) return
		if (container && document.contains(container)) return
		unmount()

		const el = document.createElement('div')
		el.id = config.id

		if (!config.attach(el)) return

		if (!document.contains(el)) return

		const vueApp = config.createApp()
		try {
			vueApp.mount(el)
			app = vueApp
			container = el
			hydrated = true
			console.log(`[Modrinth Extras] Injected ${config.id}`)
		} catch {
			console.error(`[Modrinth Extras] Failed to mount ${config.id}`)
			vueApp.unmount()
			el.parentElement?.removeChild(el)
		}
	}

	function schedule() {
		if (hydrated) {
			inject()
			return
		}
		if (timer) clearTimeout(timer)
		timer = setTimeout(() => {
			timer = null
			inject()
		}, HYDRATION_DEBOUNCE_MS)
	}

	function checkDetached(): boolean {
		if (container && !document.contains(container)) {
			console.log(`[Modrinth Extras] Detached ${config.id}`)
			unmount()
			return true
		}
		return false
	}

	return { unmount, schedule, checkDetached, config }
}

function findSidebarAnchor(): { after: HTMLElement; fallback?: boolean } | null {
	const path = window.location.pathname

	if (/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/[^/]+\/?$/.test(path)) {
		for (const card of document.querySelectorAll<HTMLElement>(
			'.card.flex-card.experimental-styles-within',
		)) {
			if (card.querySelector('h2')?.textContent?.trim() === 'Details') return { after: card }
		}
		return null
	}

	if (/^\/user\/[^/]+\/?$/.test(path)) {
		const sidebar = document.querySelector<HTMLElement>('.normal-page__sidebar')
		if (!sidebar) return null
		const cards = sidebar.querySelectorAll<HTMLElement>('.card.flex-card')
		if (cards.length > 0) return { after: cards[cards.length - 1] }
		return { after: sidebar, fallback: true }
	}

	if (/^\/organization\/[^/]+\/?$/.test(path)) {
		const sidebar = document.querySelector<HTMLElement>('.normal-page__sidebar')
		if (!sidebar) return null
		const cards = sidebar.querySelectorAll<HTMLElement>('.card.flex-card')
		if (cards.length > 0) return { after: cards[cards.length - 1] }
		return null
	}

	if (/^\/collection\/[^/]+\/?$/.test(path)) {
		const sidebar = document.querySelector<HTMLElement>('.ui-normal-page__sidebar')
		if (!sidebar) return null
		const cards = sidebar.querySelectorAll<HTMLElement>('.flex.flex-col.gap-3.p-4')
		if (cards.length > 0) return { after: cards[cards.length - 1] }
		return null
	}

	return null
}

export default defineContentScript({
	matches: ['https://modrinth.com/*'],
	cssInjectionMode: 'manifest',

	main() {
		console.log('[Modrinth Extras] Content script loaded')
		let settings: ExtensionSettings = { ...DEFAULTS }

		const notifications = createInjection({
			id: 'modrinth-extras-notifications',
			isEnabled: () => settings.showNotificationsIndicator,
			settingsKeys: ['showNotificationsIndicator'],
			persistent: true,
			attach(container) {
				const header = document.querySelector('header')
				if (!header) return false

				const triggers = [...header.querySelectorAll<HTMLElement>('.btn-dropdown-animation')]
				const userTrigger = triggers.findLast((el) => !!el.querySelector('img')) ?? null
				if (!userTrigger) return false

				let childInFlex: HTMLElement = userTrigger
				let flexRow: HTMLElement | null = userTrigger.parentElement
				while (flexRow && flexRow !== header) {
					const { display } = window.getComputedStyle(flexRow)
					if (display === 'flex' || display === 'inline-flex') break
					childInFlex = flexRow
					flexRow = flexRow.parentElement as HTMLElement | null
				}
				if (!flexRow) return false

				container.style.display = 'flex'
				container.style.alignItems = 'center'
				flexRow.insertBefore(container, childInFlex)
				return true
			},
			createApp() {
				const app = createApp({
					setup() {
						provideI18n({
							locale: ref('en-US'),
							t: (key: string) => key,
							setLocale: () => {},
						})
					},
					render: () => h(NotificationsIndicator),
				})
				app.use(FloatingVue)
				return app
			},
		})

		const sidebar = createInjection({
			id: 'modrinth-extras-sidebar-extra',
			isEnabled: () => settings.showToolsSidebar || settings.showDependenciesSidebar,
			settingsKeys: ['showToolsSidebar', 'showDependenciesSidebar'],
			persistent: false,
			attach(container) {
				const anchor = findSidebarAnchor()
				if (!anchor) return false

				container.style.display = 'contents'
				if (anchor.fallback) {
					anchor.after.appendChild(container)
				} else {
					anchor.after.after(container)
				}
				return document.contains(container)
			},
			createApp() {
				const pageUrl = window.location.href.split('?')[0].split('#')[0]
				return createApp(
					h(Sidebar, {
						pageUrl,
						showTools: settings.showToolsSidebar,
						showDependencies: settings.showDependenciesSidebar,
					}),
				)
			},
		})

		const footerBadge = createInjection({
			id: 'modrinth-extras-footer-badge',
			isEnabled: () => true,
			settingsKeys: [],
			persistent: true,
			attach(container) {
				const link = document.querySelector<HTMLAnchorElement>(
					'footer a[href="https://github.com/modrinth/code"]',
				)
				if (!link) return false

				const flexCol = link.closest('.flex.flex-wrap.justify-center.gap-3')
				if (!flexCol) return false

				container.style.display = 'flex'
				container.style.flexDirection = 'column'
				container.style.width = '100%'
				flexCol.appendChild(container)
				return true
			},
			createApp: () => createApp(h(FooterBadge)),
		})

		const injections = [notifications, sidebar, footerBadge]

		loadSettings().then((s) => {
			settings = s
			console.log('[Modrinth Extras] Settings loaded:', JSON.stringify(s))
			for (const inj of injections) inj.schedule()
		})

		browser.storage.onChanged.addListener((changes: Record<string, { newValue?: unknown }>) => {
			for (const [key, { newValue }] of Object.entries(changes)) {
				;(settings as unknown as Record<string, unknown>)[key] = newValue
			}
			for (const inj of injections) {
				if (inj.config.settingsKeys.some((k) => k in changes)) {
					inj.unmount()
					inj.schedule()
				}
			}
		})

		window.addEventListener('modrinth-extras:before-navigate', () => {
			for (const inj of injections) {
				if (!inj.config.persistent) inj.unmount()
			}
		})

		window.addEventListener('modrinth-extras:after-navigate', () => {
			for (const inj of injections) inj.schedule()
		})

		const domObserver = new MutationObserver(() => {
			for (const inj of injections) {
				inj.checkDetached()
				inj.schedule()
			}
		})
		domObserver.observe(document.documentElement, { childList: true, subtree: true })

		for (const inj of injections) inj.schedule()
	},
})
