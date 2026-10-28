import type { ExtensionSettings } from '../../core/settings'
import { SIDEBAR_CARD_IDS } from './cards'

// Cards added in newer versions aren't in a saved order yet, so they go last.
export function sidebarOrder(settings: ExtensionSettings): string[] {
	const defaults: string[] = Object.values(SIDEBAR_CARD_IDS)
	const saved = settings.sidebarLayout.order.filter((id) => defaults.includes(id))
	return [...saved, ...defaults.filter((id) => !saved.includes(id))]
}

// Only some cards show on a page, so the others keep their slots in the saved order.
export function mergeVisibleOrder(order: string[], visible: string[]): string[] {
	const queue = [...visible]
	return order.map((id) => (visible.includes(id) ? (queue.shift() ?? id) : id))
}
