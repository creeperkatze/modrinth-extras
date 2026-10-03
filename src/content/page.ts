export const PROJECT_TYPE_PATTERN =
	/^\/(mod|plugin|datapack|shader|resourcepack|modpack|map)\/([^/?#]+)/

export function getProjectSlug(): string | null {
	const match = window.location.pathname.match(PROJECT_TYPE_PATTERN)
	return match?.[2] ?? null
}

// The current page URL without its query or hash.
export function currentPageUrl(): string {
	return window.location.origin + window.location.pathname
}

function findVisibleElement(...selectors: string[]): HTMLElement | null {
	for (const selector of selectors) {
		for (const el of document.querySelectorAll<HTMLElement>(selector)) {
			if (el.offsetParent !== null || el.getClientRects().length > 0) return el
		}
	}
	return null
}

// Returns the sidebar container to append into, or null if not on a supported page.
function findSidebarParent(): HTMLElement | null {
	const path = window.location.pathname

	if (/^\/(mod|plugin|datapack|shader|resourcepack|modpack|server)\/[^/?#]+/.test(path)) {
		return findVisibleElement('.normal-page__sidebar', '.ui-normal-page__sidebar')
	}

	if (/^\/(?:user|organization)\/[^/]+\/?$/.test(path)) {
		return findVisibleElement('.normal-page__sidebar', '.ui-normal-page__sidebar')
	}

	if (/^\/collection\/[^/]+\/?$/.test(path)) {
		return findVisibleElement('.ui-normal-page__sidebar', '.normal-page__sidebar')
	}

	return null
}

export function attachToSidebar(container: HTMLElement): boolean {
	container.style.display = 'contents'
	const parent = findSidebarParent()
	if (!parent) return false
	parent.appendChild(container)
	return document.contains(container)
}
