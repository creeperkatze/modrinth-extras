export default defineContentScript({
	matches: ['https://modrinth.com/*'],
	world: 'MAIN',
	runAt: 'document_idle',

	main() {
		const w = window as Window &
			typeof globalThis & {
				__nuxt_app?: {
					$router?: unknown
					hook?: (event: string, cb: () => void) => void
					isHydrating?: boolean
				}
			}

		type VueRouter = {
			beforeEach: (cb: () => void) => void
			afterEach: (cb: () => void) => void
			push: (path: string) => Promise<unknown>
		}

		function getRouter(): VueRouter | null {
			const nuxtEl = document.getElementById('__nuxt') as
				| (HTMLElement & {
						__vue_app__?: { config?: { globalProperties?: { $router?: VueRouter } } }
				  })
				| null
			return (
				(w.__nuxt_app?.$router as VueRouter | undefined) ??
				nuxtEl?.__vue_app__?.config?.globalProperties?.$router ??
				null
			)
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

		function dispatchReady() {
			window.dispatchEvent(new CustomEvent('modrinth-extras:router-ready'))
		}

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
			dispatchReady()
		}

		// Nuxt lifecycle: mount > isHydrating=false > app:suspense:resolve
		let settling = false

		function waitForNuxtApp() {
			const nuxtApp = w.__nuxt_app
			if (nuxtApp?.hook) {
				let resolved = false
				nuxtApp.hook('app:suspense:resolve', () => {
					if (resolved) return
					resolved = true
					requestAnimationFrame(onHydrated)
				})
				if (nuxtApp.isHydrating === false) {
					requestAnimationFrame(() => {
						if (!resolved) {
							resolved = true
							onHydrated()
						}
					})
				}
				return true
			}
			if (nuxtApp?.isHydrating === false) {
				onHydrated()
				return true
			}
			return false
		}

		function checkReady(): boolean {
			if (waitForNuxtApp()) return true

			// __vue_app__ is observable via MutationObserver, __nuxt_app isn't
			const nuxtEl = document.getElementById('__nuxt') as
				| (HTMLElement & { __vue_app__?: object })
				| null
			if (!nuxtEl?.__vue_app__ || settling) return false

			settling = true
			let frames = 0
			const poll = () => {
				if (waitForNuxtApp()) return
				if (++frames < 120) {
					requestAnimationFrame(poll)
				} else {
					onHydrated()
				}
			}
			requestAnimationFrame(poll)
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
