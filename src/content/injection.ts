import { installTooltipDirective, TooltipDirective } from '@modrinth/ui'
import { type App, type Component, createApp, h } from 'vue'

import { installI18n } from '../core/i18n/i18n'
import type { ExtensionSettings } from '../core/settings'

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
	installTooltipDirective(app)
	mountTooltipHost()
	installI18n(app)
	return app
}

interface InjectionConfig {
	id: string
	isEnabled: () => boolean
	settingsKeys: (keyof ExtensionSettings)[]
	attach: (container: HTMLElement) => boolean
	createApp: () => App
	persistent: boolean
	// Keeps the injection mounted across tab navigations within the same project
	projectScoped?: boolean
	// Remounts the injection when this key changes between navigations within the same project
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

export function createDynamicInjection(config: DynamicInjectionConfig) {
	const injected = new Map<Element, { container: HTMLElement; app: App }>()

	function unmount(): void {
		for (const { container, app } of injected.values()) {
			app.unmount()
			container.parentElement?.removeChild(container)
		}
		injected.clear()
	}

	function schedule(): void {
		if (!pageState.hydrated) return
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

export type Injection =
	| ReturnType<typeof createInjection>
	| ReturnType<typeof createDynamicInjection>

export function remountForChangedSettings(
	injections: Injection[],
	oldSettings: ExtensionSettings | undefined,
	newSettings: ExtensionSettings | undefined,
) {
	for (const inj of injections) {
		if (inj.config.settingsKeys.length === 0) continue
		const changed = inj.config.settingsKeys.some(
			(key) => JSON.stringify(oldSettings?.[key]) !== JSON.stringify(newSettings?.[key]),
		)
		if (changed) {
			inj.unmount()
			inj.schedule()
		}
	}
}
