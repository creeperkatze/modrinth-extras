export default defineContentScript({
	matches: ['https://modrinth.com/*'],
	world: 'MAIN',
	runAt: 'document_idle',

	main() {
		type VueRouter = {
			beforeEach: (cb: () => void) => void
			afterEach: (cb: () => void) => void
			push: (path: string) => Promise<unknown>
		}

		type NuxtApp = {
			isHydrating?: boolean
			hook?: (event: string, cb: () => void) => () => void
		}

		type VueApp = {
			$nuxt?: NuxtApp
			config?: { globalProperties?: { $router?: VueRouter } }
		}

		// Vue keeps its app on the mount element even in production builds, and Nuxt hangs off it
		function getVueApp(): VueApp | null {
			const nuxtEl = document.getElementById('__nuxt') as
				| (HTMLElement & { __vue_app__?: VueApp })
				| null
			return nuxtEl?.__vue_app__ ?? null
		}

		function getRouter(): VueRouter | null {
			return getVueApp()?.config?.globalProperties?.$router ?? null
		}

		window.addEventListener('message', (e: MessageEvent) => {
			if (e.origin !== window.location.origin) return
			if (e.data?.type !== 'modrinth-extras:navigate') return
			const { path, fallbackUrl } = e.data
			const router = getRouter()
			if (!router) {
				window.location.href = fallbackUrl
				return
			}

			// Same-path navigation needs a remount to re-trigger useAsyncData
			const targetPathname = path.split('?')[0]
			if (targetPathname === window.location.pathname) {
				router.push('/').then(() => router.push(path))
			} else {
				router.push(path)
			}
		})

		type VNode = {
			component?: { provides: Record<symbol, unknown>; subTree?: VNode } | null
			suspense?: { activeBranch?: VNode | null } | null
			children?: unknown
		}
		type NotificationManager = { addNotification: (notification: object) => void }

		// The same key Modrinth's components inject the manager with
		const NOTIFICATION_MANAGER_KEY = Symbol.for('modrinth:notificationManager')
		let notificationManager: NotificationManager | null = null

		// The website provides its toast manager from a component, not the app, so the tree is searched
		function findNotificationManager(): NotificationManager | null {
			if (notificationManager) return notificationManager
			// Vue keeps the root vnode on its mount element, even in production builds
			const nuxtEl = document.getElementById('__nuxt') as (HTMLElement & { _vnode?: VNode }) | null
			const queue: unknown[] = [nuxtEl?._vnode]
			for (let steps = 0; queue.length > 0 && steps < 5000; steps++) {
				const vnode = queue.shift() as VNode | null | undefined
				if (!vnode || typeof vnode !== 'object') continue
				const instance = vnode.component
				if (instance) {
					const provided = instance.provides[NOTIFICATION_MANAGER_KEY] as
						| NotificationManager
						| undefined
					if (provided) {
						notificationManager = provided
						return provided
					}
					queue.push(instance.subTree)
					continue
				}
				if (vnode.suspense) queue.push(vnode.suspense.activeBranch)
				if (Array.isArray(vnode.children)) queue.push(...vnode.children)
			}
			return null
		}

		window.addEventListener('message', (e: MessageEvent) => {
			if (e.origin !== window.location.origin) return
			if (e.data?.type !== 'modrinth-extras:notify') return
			const manager = findNotificationManager()
			if (!manager) {
				console.error('[Modrinth Extras] Failed to find the website notification manager')
				return
			}
			const { title, text, notificationType } = e.data
			manager.addNotification({ title, text, type: notificationType })
		})

		function onHydrated() {
			const router = getRouter()
			if (router) {
				router.beforeEach(() => {
					window.dispatchEvent(new CustomEvent('modrinth-extras:before-navigate'))
				})
				router.afterEach(() => {
					window.dispatchEvent(new CustomEvent('modrinth-extras:after-navigate'))
				})
			}
			// Also left on the page for a content script that starts after the event
			document.documentElement.dataset.modrinthExtrasHydrated = ''
			window.dispatchEvent(new CustomEvent('modrinth-extras:hydrated'))
		}

		// Injecting while Nuxt still hydrates makes it throw, so this waits for it to finish
		function checkReady(): boolean {
			const vueApp = getVueApp()
			if (!vueApp) return false
			const nuxtApp = vueApp.$nuxt
			if (nuxtApp?.isHydrating === false) {
				requestAnimationFrame(onHydrated)
			} else if (nuxtApp?.hook) {
				// It fires again on every page change
				const unhook = nuxtApp.hook('app:suspense:resolve', () => {
					unhook()
					requestAnimationFrame(onHydrated)
				})
			} else {
				// A Nuxt version that works differently, so it's given time to hydrate
				console.error(
					'[Modrinth Extras] Failed to find the Nuxt hydration hook, injecting in 2 seconds instead',
				)
				setTimeout(onHydrated, 2000)
			}
			return true
		}

		if (!checkReady()) {
			const observer = new MutationObserver(() => {
				if (checkReady()) observer.disconnect()
			})
			observer.observe(document.documentElement, { childList: true, subtree: true })
		}
	},
})
