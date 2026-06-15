/**
 * Navigation helpers for the ISOLATED world content script.
 *
 * The actual Nuxt router lives in the MAIN world and is accessed via
 * the router-bridge content script through CustomEvents.
 */

// Resolve a relative path to an absolute URL on the current origin
export function resolveLink(link: string): string {
	if (link.startsWith('http')) return link
	return window.location.origin + link
}

// Navigate using the page router (SPA) via the MAIN world bridge.
// Uses postMessage instead of CustomEvent because Firefox's Xray
// wrappers strip event.detail when crossing the ISOLATED → MAIN boundary.
export function navigate(path: string): void {
	if (path.startsWith('http')) {
		try {
			const url = new URL(path)
			if (url.origin === window.location.origin) {
				path = url.pathname + url.search + url.hash
			} else {
				window.location.href = path
				return
			}
		} catch {
			// invalid URL, treat as relative path
		}
	}

	window.postMessage(
		{ type: 'modrinth-extras:navigate', path, fallbackUrl: resolveLink(path) },
		window.location.origin,
	)
}
