import '../assets/tailwind.css'

import { provideI18n } from '@modrinth/ui'
import FloatingVue from 'floating-vue'
import { type App, createApp, h, ref } from 'vue'
import { browser } from 'wxt/browser'

import ActivitySparkline from '../components/ActivitySparkline.vue'
import DependencyTree from '../components/DependencyTree.vue'
import DiscordSidebar from '../components/DiscordSidebar.vue'
import FooterBadge from '../components/FooterBadge.vue'
import GitHubSidebar from '../components/GitHubSidebar.vue'
import NotificationsIndicator from '../components/NotificationsIndicator.vue'
import QuickSearch from '../components/QuickSearch.vue'
import ToolsSidebar from '../components/ToolsSidebar.vue'
import { DEFAULTS, type ExtensionSettings, loadSettings } from '../helpers/settings'

// Gate injections until Nuxt hydration is complete. The router-bridge
// (MAIN world) dispatches "modrinth-extras:router-ready" once it hooks
// into the Nuxt router, which only becomes available after hydration.
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
			console.log(`[Modrinth Extras] Injected ${config.id}`)
		} catch {
			console.error(`[Modrinth Extras] Failed to mount ${config.id}`)
			vueApp.unmount()
			el.parentElement?.removeChild(el)
		}
	}

	function schedule() {
		if (!hydrated) return
		inject()
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

// Returns the sidebar container to appendChild into, or null if not on a supported page.
function findSidebarParent(): HTMLElement | null {
	const path = window.location.pathname

	if (/^\/(mod|plugin|datapack|shader|resourcepack|modpack|server)\/[^/]+\/?$/.test(path)) {
		for (const card of document.querySelectorAll<HTMLElement>(
			'.card.flex-card.experimental-styles-within',
		)) {
			if (card.querySelector('h2')?.textContent?.trim() === 'Details')
				return card.parentElement as HTMLElement | null
		}
		return null
	}

	if (/^\/user\/[^/]+\/?$/.test(path)) {
		return document.querySelector<HTMLElement>('.normal-page__sidebar')
	}

	if (/^\/organization\/[^/]+\/?$/.test(path)) {
		return document.querySelector<HTMLElement>('.normal-page__sidebar')
	}

	if (/^\/collection\/[^/]+\/?$/.test(path)) {
		return document.querySelector<HTMLElement>('.ui-normal-page__sidebar')
	}

	return null
}

function attachToSidebar(container: HTMLElement): boolean {
	container.style.display = 'contents'
	const parent = findSidebarParent()
	if (!parent) return false
	parent.appendChild(container)
	return document.contains(container)
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

		const toolsSidebar = createInjection({
			id: 'modrinth-extras-tools-sidebar',
			isEnabled: () => settings.showToolsSidebar,
			settingsKeys: ['showToolsSidebar'],
			persistent: false,
			attach: attachToSidebar,
			createApp() {
				const pageUrl = window.location.href.split('?')[0].split('#')[0]
				return createApp(h(ToolsSidebar, { pageUrl }))
			},
		})

		const dependencySidebar = createInjection({
			id: 'modrinth-extras-dependency-sidebar',
			isEnabled: () => settings.showDependenciesSidebar,
			settingsKeys: ['showDependenciesSidebar'],
			persistent: false,
			attach(container) {
				const path = window.location.pathname
				if (!/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/[^/]+\/?$/.test(path))
					return false
				return attachToSidebar(container)
			},
			createApp() {
				const slug = window.location.pathname.match(
					/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([^/]+)/,
				)?.[2]
				return createApp(h(DependencyTree, { projectSlug: slug ?? '' }))
			},
		})

		const activitySparkline = createInjection({
			id: 'modrinth-extras-activity-sparkline',
			isEnabled: () => settings.showActivitySparkline,
			settingsKeys: ['showActivitySparkline'],
			persistent: false,
			attach(container) {
				const path = window.location.pathname
				if (!/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/[^/]+\/?$/.test(path))
					return false
				const header = document.querySelector('.normal-page__header')
				if (!header) return false
				const borderDiv = header.querySelector<HTMLElement>(
					'div.border-b.border-solid.border-divider',
				)
				if (!borderDiv) return false
				borderDiv.style.position = 'relative'
				borderDiv.style.isolation = 'isolate'
				container.style.display = 'contents'
				borderDiv.appendChild(container)
				return document.contains(container)
			},
			createApp() {
				const slug = window.location.pathname.match(
					/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([^/]+)/,
				)?.[2]
				return createApp(h(ActivitySparkline, { projectSlug: slug ?? '' }))
			},
		})

		const gitHubSidebar = createInjection({
			id: 'modrinth-extras-github-sidebar',
			isEnabled: () => settings.showGitHubSidebar,
			settingsKeys: ['showGitHubSidebar'],
			persistent: false,
			attach: attachToSidebar,
			createApp() {
				const pageUrl = window.location.href.split('?')[0].split('#')[0]
				return createApp(h(GitHubSidebar, { pageUrl }))
			},
		})

		const discordSidebar = createInjection({
			id: 'modrinth-extras-discord-sidebar',
			isEnabled: () => settings.showDiscordSidebar,
			settingsKeys: ['showDiscordSidebar'],
			persistent: false,
			attach: attachToSidebar,
			createApp() {
				const pageUrl = window.location.href.split('?')[0].split('#')[0]
				return createApp(h(DiscordSidebar, { pageUrl }))
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

		const quickSearch = createInjection({
			id: 'modrinth-extras-quick-search',
			isEnabled: () => settings.showQuickSearch,
			settingsKeys: ['showQuickSearch'],
			persistent: true,
			attach(container) {
				document.body.appendChild(container)
				return true
			},
			createApp: () => createApp(h(QuickSearch)),
		})

		const injections = [
			notifications,
			toolsSidebar,
			dependencySidebar,
			activitySparkline,
			gitHubSidebar,
			discordSidebar,
			footerBadge,
			quickSearch,
		]

		function markHydrated() {
			if (hydrated) return
			hydrated = true
			for (const inj of injections) inj.schedule()
		}

		window.addEventListener('modrinth-extras:router-ready', markHydrated, { once: true })

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
	},
})
