/**
 * MAIN world content script that detects SPA navigation on CurseForge.
 *
 * CurseForge uses React Router which captures a reference to history.pushState
 * during initialization. Patching pushState from the ISOLATED world has no
 * effect because React already holds the original reference. This MAIN world
 * script patches pushState/replaceState before React can cache them and
 * dispatches CustomEvents so the ISOLATED world script can react.
 */
export default defineContentScript({
	matches: ['https://www.curseforge.com/*'],
	world: 'MAIN',
	runAt: 'document_start',

	main() {
		const originalPushState = history.pushState.bind(history)
		history.pushState = function (...args: Parameters<typeof history.pushState>) {
			originalPushState(...args)
			window.dispatchEvent(new CustomEvent('modrinth-extras:cf-navigated'))
		}

		const originalReplaceState = history.replaceState.bind(history)
		history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
			originalReplaceState(...args)
			window.dispatchEvent(new CustomEvent('modrinth-extras:cf-navigated'))
		}

		window.addEventListener('popstate', () => {
			window.dispatchEvent(new CustomEvent('modrinth-extras:cf-navigated'))
		})
	},
})
