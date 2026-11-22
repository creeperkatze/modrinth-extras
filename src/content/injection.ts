import { installTooltipDirective, TooltipDirective } from '@modrinth/ui'
import { type App, type Component, createApp, h } from 'vue'

import { installI18n } from '../core/i18n/i18n'
import { installQuery } from '../core/query'
import type { ExtensionSettings } from '../core/settings'
import { installErrorReporting } from '../core/telemetry'

export type SettingsGetter = () => ExtensionSettings

// Injections wait for Nuxt hydration, which the MAIN world bridge reports with "modrinth-extras:router-ready".
export const pageState = { hydrated: false, navigating: false }

let tooltipHostMounted = false

// Every extension app shares one tooltip host, like Modrinth's layout does
function mountTooltipHost() {
	if (tooltipHostMounted) return
	tooltipHostMounted = true
	const el = document.createElement('div')
	el.id = 'modrinth-extras-tooltip-host'
	document.body.appendChild(el)
	createApp(TooltipDirective).mount(el)
}

export function createExtensionApp(component: Component, props?: Record<string, unknown>): App {
	const app = createApp(h(component, props))
	installErrorReporting(app)
	installTooltipDirective(app)
	mountTooltipHost()
	installI18n(app)
	installQuery(app)
	return app
}

interface InjectionConfig {
	id: string
	isEnabled: () => boolean
	attach: (container: HTMLElement) => boolean
	createApp: () => App
	persistent: boolean
	projectScoped?: boolean
	scopeKey?: () => string
}

export function createInjection(config: InjectionConfig) {
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
		if (!pageState.hydrated || pageState.navigating) return
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

	function refresh() {
		if (config.isEnabled()) schedule()
		else unmount()
	}

	return { unmount, schedule, refresh, checkDetached, config }
}

interface DynamicInjectionConfig {
	id?: string
	persistent: boolean
	projectScoped?: boolean
	scopeKey?: () => string
	isEnabled: () => boolean
	targets: string
	attach: (target: HTMLElement) => HTMLElement | null
	createApp: (target: HTMLElement) => App
	onSchedule?: () => void
	// Only mounts on targets near the viewport, for pages that can list hundreds of them
	lazy?: boolean
}

export function createDynamicInjection(config: DynamicInjectionConfig) {
	const injected = new Map<Element, { container: HTMLElement; app: App }>()
	const nearViewport = new Set<Element>()
	const observed = new Set<Element>()
	const observer = config.lazy
		? new IntersectionObserver(onIntersect, { rootMargin: '100% 0px' })
		: null

	function unmountTarget(target: Element): void {
		const entry = injected.get(target)
		if (!entry) return
		entry.app.unmount()
		entry.container.parentElement?.removeChild(entry.container)
		injected.delete(target)
	}

	function mountTarget(target: HTMLElement): void {
		if (injected.has(target)) return
		const container = config.attach(target)
		if (!container) return
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

	// Unmounting a card far off screen also cancels its pending requests
	function onIntersect(entries: IntersectionObserverEntry[]): void {
		for (const entry of entries) {
			const target = entry.target as HTMLElement
			if (entry.isIntersecting) {
				nearViewport.add(target)
				if (pageState.hydrated && config.isEnabled()) mountTarget(target)
			} else {
				nearViewport.delete(target)
				unmountTarget(target)
			}
		}
	}

	function forget(target: Element): void {
		observer?.unobserve(target)
		observed.delete(target)
		nearViewport.delete(target)
	}

	function unmount(): void {
		for (const target of injected.keys()) unmountTarget(target)
		observer?.disconnect()
		observed.clear()
		nearViewport.clear()
	}

	function checkDetached(): boolean {
		let any = false
		for (const [target, { container }] of injected) {
			if (!document.contains(target) || !document.contains(container)) {
				unmountTarget(target)
				any = true
			}
		}
		for (const target of observed) {
			if (!document.contains(target)) forget(target)
		}
		return any
	}

	function schedule(): void {
		if (!pageState.hydrated) return
		if (!config.isEnabled()) {
			unmount()
			return
		}
		config.onSchedule?.()
		checkDetached()
		for (const target of document.querySelectorAll<HTMLElement>(config.targets)) {
			if (!observer) {
				mountTarget(target)
				continue
			}
			if (!observed.has(target)) {
				observed.add(target)
				observer.observe(target)
			} else if (nearViewport.has(target)) {
				// Retries targets whose attach failed while they were still rendering
				mountTarget(target)
			}
		}
	}

	return { unmount, schedule, refresh: schedule, checkDetached, config }
}

export type Injection =
	| ReturnType<typeof createInjection>
	| ReturnType<typeof createDynamicInjection>
