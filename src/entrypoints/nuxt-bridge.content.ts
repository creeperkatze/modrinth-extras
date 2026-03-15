/**
 * MAIN world content script that bridges the Nuxt app to the extension.
 *
 * The primary content script (content.ts) runs in the ISOLATED world and
 * cannot access the page's JavaScript — including `window.__nuxt_app` and
 * the Nuxt router. This tiny MAIN world script acts as a bridge:
 *
 *  - Dispatches `modrinth-extras:router-ready` after Nuxt hydration completes.
 *  - Hooks into the Nuxt router lifecycle (beforeEach / afterEach) and
 *    dispatches CustomEvents so the ISOLATED script can react.
 *  - Listens for `modrinth-extras:navigate` events and calls `router.push()`
 *    for true client-side SPA navigation.
 */
export default defineContentScript({
	matches: ['https://modrinth.com/*'],
	world: 'MAIN',
	runAt: 'document_idle',

	main() {
		const w = window as Window &
			typeof globalThis & {
				__nuxt_app?: { $router?: unknown; hook?: (event: string, cb: () => void) => void }
			}

		type VueRouter = {
			beforeEach: (cb: () => void) => void
			afterEach: (cb: () => void) => void
			push: (path: string) => void
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
			if (router) {
				router.push(path)
			} else {
				window.location.href = fallbackUrl
			}
		})

		function dispatchReady() {
			// Ensures we fire after Vue's synchronous hydration
			// patching and the subsequent browser paint.
			requestAnimationFrame(() => {
				requestAnimationFrame(() => {
					window.dispatchEvent(new CustomEvent('modrinth-extras:router-ready'))
				})
			})
		}

		function hookRouter(): boolean {
			const router = getRouter()
			if (!router) return false

			router.beforeEach(() => {
				window.dispatchEvent(new CustomEvent('modrinth-extras:before-navigate'))
			})
			router.afterEach(() => {
				window.dispatchEvent(new CustomEvent('modrinth-extras:after-navigate'))
			})

			dispatchReady()
			return true
		}

		if (!hookRouter()) {
			const observer = new MutationObserver(() => {
				if (hookRouter()) observer.disconnect()
			})
			observer.observe(document.documentElement, { childList: true, subtree: true })
		}
	},
})
