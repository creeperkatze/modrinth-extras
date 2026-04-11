export default defineContentScript({
	matches: [
		'https://modrinth.com/*',
		...(import.meta.env.VITE_IS_TESTING ? ['http://localhost:3000/*'] : []),
	],
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
