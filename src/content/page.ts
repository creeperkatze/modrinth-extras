import { SIDEBAR_LAYOUT_ID, sidebarCardSetting } from '../features/sidebar-layout/cards'

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

function sidebarRank(element: Element, order: string[]): number {
	if (element.id === SIDEBAR_LAYOUT_ID) return Infinity
	const index = order.indexOf(element.id)
	return index === -1 ? order.length : index
}

function extensionChildren(parent: HTMLElement): HTMLElement[] {
	return [...parent.children].filter(
		(child): child is HTMLElement =>
			child instanceof HTMLElement &&
			(!!sidebarCardSetting(child) || child.id === SIDEBAR_LAYOUT_ID),
	)
}

// Cards stay below Modrinth's own and follow the given order of card IDs, whichever mounts first.
export function attachToSidebar(container: HTMLElement, order: string[] = []): boolean {
	// A real box the layout editor can outline. Card margins still collapse through it.
	container.style.display = 'block'
	const parent = findSidebarParent()
	if (!parent) return false
	const rank = sidebarRank(container, order)
	const next = extensionChildren(parent).find((child) => sidebarRank(child, order) > rank)
	parent.insertBefore(container, next ?? null)
	return document.contains(container)
}

export function applySidebarOrder(order: string[]): void {
	const parent = findSidebarParent()
	if (!parent) return
	const current = extensionChildren(parent)
	const sorted = [...current].sort((a, b) => sidebarRank(a, order) - sidebarRank(b, order))
	if (sorted.every((child, index) => child === current[index])) return
	for (const child of sorted) parent.appendChild(child)
}
