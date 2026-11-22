export function resolveLink(link: string): string {
	if (link.startsWith('http')) return link
	return window.location.origin + link
}

// Goes through the MAIN world bridge with postMessage, since Firefox strips CustomEvent details
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
			// Not a valid URL, so it is treated as a path
		}
	}

	window.postMessage(
		{ type: 'modrinth-extras:navigate', path, fallbackUrl: resolveLink(path) },
		window.location.origin,
	)
}
