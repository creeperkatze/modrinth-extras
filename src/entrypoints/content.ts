import '../assets/tailwind.css'

import FloatingVue from 'floating-vue'
import { type App, createApp, h } from 'vue'
import { browser } from 'wxt/browser'

import ActivitySparkline from '../components/ActivitySparkline.vue'
import DependenciesSidebar from '../components/DependenciesSidebar.vue'
import DiscordSidebar from '../components/DiscordSidebar.vue'
import ErrorNotice from '../components/ErrorNotice.vue'
import FooterBadge from '../components/FooterBadge.vue'
import GalleryBackground from '../components/GalleryBackground.vue'
import GitHubSidebar from '../components/GitHubSidebar.vue'
import NotificationsIndicator from '../components/NotificationsIndicator.vue'
import ProjectCardActions from '../components/ProjectCardActions.vue'
import QuickSearch from '../components/QuickSearch.vue'
import ToolsSidebar from '../components/ToolsSidebar.vue'
import { initFollowState } from '../helpers/followState'
import { detectBrowserLocale, i18n, installI18n, loadSavedLocale } from '../helpers/i18n'
import { navigate } from '../helpers/page-router'
import { DEFAULTS, type ExtensionSettings, getSettings } from '../helpers/settings'

// Gate injections until Nuxt hydration is complete. The router-bridge
// (MAIN world) dispatches "modrinth-extras:router-ready" once it hooks
// into the Nuxt router, which only becomes available after hydration.
let hydrated = false
let navigating = false

interface InjectionConfig {
	id: string
	isEnabled: () => boolean
	settingsKeys: (keyof ExtensionSettings)[]
	attach: (container: HTMLElement) => boolean
	createApp: () => App
	persistent: boolean
	/** When true, the injection persists across same-project tab navigations */
	projectScoped?: boolean
	/** Optional fine-grained scope key; if it changes between navigations (within the same project), force re-mount */
	scopeKey?: () => string
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
		if (!hydrated || navigating) return
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

interface DynamicInjectionConfig {
	id?: string
	settingsKeys: (keyof ExtensionSettings)[]
	persistent: boolean
	projectScoped?: boolean
	scopeKey?: () => string
	isEnabled: () => boolean
	targets: string
	attach: (target: HTMLElement) => HTMLElement | null
	createApp: (target: HTMLElement) => App
	onSchedule?: () => void
}

function createDynamicInjection(config: DynamicInjectionConfig) {
	const injected = new Map<Element, { container: HTMLElement; app: App }>()

	function unmount(): void {
		for (const { container, app } of injected.values()) {
			app.unmount()
			container.parentElement?.removeChild(container)
		}
		injected.clear()
	}

	function schedule(): void {
		if (!hydrated) return
		if (!config.isEnabled()) {
			unmount()
			return
		}
		config.onSchedule?.()
		// Remove stale entries whose target or injected container left the DOM
		for (const [target, { container, app }] of injected) {
			if (!document.contains(target) || !document.contains(container)) {
				app.unmount()
				container.parentElement?.removeChild(container)
				injected.delete(target)
			}
		}
		// Inject into any new targets
		for (const target of document.querySelectorAll<HTMLElement>(config.targets)) {
			if (injected.has(target)) continue
			const container = config.attach(target)
			if (!container) continue
			const app = config.createApp(target)
			try {
				app.mount(container)
				injected.set(target, { container, app })
			} catch (err) {
				console.error(`[Modrinth Extras] Failed to mount injection for target:`, err)
				app.unmount()
				container.parentElement?.removeChild(container)
			}
		}
	}

	function checkDetached(): boolean {
		let any = false
		for (const [target, { container, app }] of injected) {
			if (!document.contains(target) || !document.contains(container)) {
				app.unmount()
				container.parentElement?.removeChild(container)
				injected.delete(target)
				any = true
			}
		}
		return any
	}

	return { unmount, schedule, checkDetached, config }
}

const PROJECT_TYPE_PATTERN = /^\/(mod|plugin|datapack|shader|resourcepack|modpack|map)\/([^/?#]+)/

function getProjectSlug(): string | null {
	const match = window.location.pathname.match(PROJECT_TYPE_PATTERN)
	return match?.[2] ?? null
}

function attachCardActions(card: HTMLElement): HTMLElement | null {
	const href =
		card.parentElement?.querySelector<HTMLAnchorElement>('a[href]')?.getAttribute('href') ?? ''
	if (!href.match(PROJECT_TYPE_PATTERN)) return null

	const listCardDiv = card.querySelector<HTMLElement>('.grid-project-card-list')
	if (listCardDiv) {
		listCardDiv.classList.add('has-actions')
		const el = document.createElement('div')
		el.style.cssText =
			'grid-area:actions;display:flex;gap:0.25rem;flex-shrink:0;margin-left:auto;align-items:center;pointer-events:auto'
		listCardDiv.appendChild(el)
		return el
	}

	for (const el of card.querySelectorAll<HTMLElement>('[class*="empty:hidden"]')) {
		if (!el.className.includes('grid-project-card-list__')) {
			const container = document.createElement('div')
			container.style.cssText = 'display:contents;pointer-events:auto'
			el.appendChild(container)
			return container
		}
	}

	return null
}

// Returns the sidebar container to appendChild into, or null if not on a supported page.
function findSidebarParent(): HTMLElement | null {
	const path = window.location.pathname

	if (/^\/(mod|plugin|datapack|shader|resourcepack|modpack|server)\/[^/?#]+/.test(path)) {
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
		loadSavedLocale().catch(() => {})
		let settings: ExtensionSettings = { ...DEFAULTS }

		const notifications = createInjection({
			id: 'modrinth-extras-notifications',
			isEnabled: () => settings.notificationsIndicator.enabled,
			settingsKeys: ['notificationsIndicator'],
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
				const app = createApp(h(NotificationsIndicator))
				app.use(FloatingVue)
				installI18n(app)
				return app
			},
		})

		const toolsSidebar = createInjection({
			id: 'modrinth-extras-tools-sidebar',
			isEnabled: () => settings.toolsSidebar.enabled,
			settingsKeys: ['toolsSidebar'],
			persistent: false,
			projectScoped: true,
			attach: attachToSidebar,
			createApp() {
				const pageUrl = window.location.href.split('?')[0].split('#')[0]
				const app = createApp(h(ToolsSidebar, { pageUrl }))
				installI18n(app)
				return app
			},
		})

		const PROJECT_DEP_PATTERN =
			/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([^/?#]+)(?:\/version\/([^/?#]+))?/

		const dependencySidebar = createInjection({
			id: 'modrinth-extras-dependency-sidebar',
			isEnabled: () => settings.dependenciesSidebar.enabled,
			settingsKeys: ['dependenciesSidebar'],
			persistent: false,
			projectScoped: true,
			scopeKey: () =>
				window.location.pathname.match(PROJECT_DEP_PATTERN)?.slice(2, 4).join('/') ?? '',
			attach(container) {
				if (!PROJECT_DEP_PATTERN.test(window.location.pathname)) return false
				return attachToSidebar(container)
			},
			createApp() {
				const match = window.location.pathname.match(PROJECT_DEP_PATTERN)
				const slug = match?.[2] ?? ''
				const versionNumber = match?.[3]
				const app = createApp(h(DependenciesSidebar, { projectSlug: slug, versionNumber }))
				app.use(FloatingVue)
				installI18n(app)
				return app
			},
		})

		const activitySparkline = createInjection({
			id: 'modrinth-extras-activity-sparkline',
			isEnabled: () => settings.activitySparkline.enabled,
			settingsKeys: ['activitySparkline'],
			persistent: false,
			projectScoped: true,
			attach(container) {
				const path = window.location.pathname
				if (!/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/[^/?#]+/.test(path))
					return false
				const header = document.querySelector('.normal-page__header')
				if (!header) return false
				// Try the border div first (description/versions tabs), fall back to header itself (gallery tab)
				const target =
					header.querySelector<HTMLElement>('div.border-b.border-solid.border-divider') ??
					(header as HTMLElement)
				target.style.position = 'relative'
				target.style.isolation = 'isolate'
				container.style.display = 'contents'
				target.appendChild(container)
				return document.contains(container)
			},
			createApp() {
				const slug = window.location.pathname.match(
					/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([^/]+)/,
				)?.[2]
				const app = createApp(h(ActivitySparkline, { projectSlug: slug ?? '' }))
				installI18n(app)
				return app
			},
		})

		const galleryBackground = createInjection({
			id: 'modrinth-extras-gallery-background',
			isEnabled: () => settings.galleryBackground.enabled,
			settingsKeys: ['galleryBackground'],
			persistent: false,
			projectScoped: true,
			attach(container) {
				const path = window.location.pathname
				if (!/^\/(mod|plugin|datapack|shader|resourcepack|modpack|server)\/[^/?#]+/.test(path))
					return false
				const header = document.querySelector('.normal-page__header')
				if (!header) return false
				const page = header.parentElement
				if (!page) return false
				container.style.display = 'contents'
				page.insertBefore(container, page.firstChild)
				return true
			},
			createApp() {
				const slug = window.location.pathname.match(
					/^\/(mod|plugin|datapack|shader|resourcepack|modpack|server)\/([^/]+)/,
				)?.[2]
				const app = createApp(h(GalleryBackground, { projectSlug: slug ?? '' }))
				return app
			},
		})

		const gitHubSidebar = createInjection({
			id: 'modrinth-extras-github-sidebar',
			isEnabled: () => settings.githubSidebar.enabled,
			settingsKeys: ['githubSidebar'],
			persistent: false,
			projectScoped: true,
			attach: attachToSidebar,
			createApp() {
				const pageUrl = window.location.href.split('?')[0].split('#')[0]
				const app = createApp(h(GitHubSidebar, { pageUrl }))
				installI18n(app)
				return app
			},
		})

		const discordSidebar = createInjection({
			id: 'modrinth-extras-discord-sidebar',
			isEnabled: () => settings.discordSidebar.enabled,
			settingsKeys: ['discordSidebar'],
			persistent: false,
			projectScoped: true,
			attach: attachToSidebar,
			createApp() {
				const pageUrl = window.location.href.split('?')[0].split('#')[0]
				const app = createApp(h(DiscordSidebar, { pageUrl }))
				installI18n(app)
				return app
			},
		})

		const errorNotice = createInjection({
			id: 'modrinth-extras-error-notice',
			isEnabled: () => true,
			settingsKeys: [],
			persistent: false,
			attach(container) {
				const errorBox = document.querySelector('.error-box')
				if (!errorBox) return false

				errorBox.appendChild(container)
				return true
			},
			createApp() {
				const app = createApp(h(ErrorNotice))
				installI18n(app)
				return app
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
			createApp() {
				const app = createApp(h(FooterBadge))
				installI18n(app)
				return app
			},
		})

		const quickSearch = createInjection({
			id: 'modrinth-extras-quick-search',
			isEnabled: () => settings.quickSearch.enabled,
			settingsKeys: ['quickSearch'],
			persistent: true,
			attach(container) {
				document.body.appendChild(container)
				return true
			},
			createApp() {
				const app = createApp(h(QuickSearch))
				installI18n(app)
				return app
			},
		})

		const projectCardActions = createDynamicInjection({
			settingsKeys: ['projectCardActions'],
			persistent: false,
			isEnabled: () => settings.projectCardActions.enabled,
			targets: '.project-card-container',
			onSchedule: () => initFollowState(),
			attach: attachCardActions,
			createApp: (target) => {
				const href =
					target.parentElement?.querySelector<HTMLAnchorElement>('a[href]')?.getAttribute('href') ??
					''
				const [, projectType, projectSlug] = href.match(PROJECT_TYPE_PATTERN) ?? []
				const app = createApp(h(ProjectCardActions, { projectSlug, projectType }))
				app.use(FloatingVue)
				installI18n(app)
				return app
			},
		})

		const injections = [
			notifications,
			toolsSidebar,
			dependencySidebar,
			activitySparkline,
			galleryBackground,
			gitHubSidebar,
			discordSidebar,
			errorNotice,
			footerBadge,
			quickSearch,
			projectCardActions,
		]

		function markHydrated() {
			if (hydrated) return
			hydrated = true
			for (const inj of injections) inj.schedule()
		}

		window.addEventListener('modrinth-extras:router-ready', markHydrated, { once: true })

		browser.runtime.onMessage.addListener((message) => {
			if (message.type === 'navigate') navigate(message.path as string)
		})

		getSettings().then((s) => {
			settings = s
			console.log('[Modrinth Extras] Settings loaded:', JSON.stringify(s))
			for (const inj of injections) inj.schedule()
		})

		browser.storage.onChanged.addListener((changes: Record<string, { newValue?: unknown }>) => {
			if (!('settings' in changes)) return
			const newSettings = changes['settings']?.newValue as ExtensionSettings | undefined
			Object.assign(settings, newSettings ?? {})
			const newLocale = newSettings?.locale?.value
			i18n.global.locale.value = newLocale || detectBrowserLocale()
			for (const inj of injections) {
				if (inj.config.settingsKeys.length > 0) {
					inj.unmount()
					inj.schedule()
				}
			}
		})

		let prevProjectSlug: string | null = null
		const prevScopeKeys = new Map<string, string>()

		window.addEventListener('modrinth-extras:before-navigate', () => {
			navigating = true
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

		window.addEventListener('modrinth-extras:after-navigate', () => {
			navigating = false
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
			for (const inj of injections) {
				inj.checkDetached()
				inj.schedule()
			}
		})
		domObserver.observe(document.documentElement, { childList: true, subtree: true })
		window.addEventListener('pagehide', () => domObserver.disconnect(), { once: true })
	},
})
