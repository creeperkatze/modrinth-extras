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
