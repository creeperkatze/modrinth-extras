import { ref } from 'vue'

import { type ExtensionSettings, getSettings, saveSettings } from '../../core/settings'
import { SIDEBAR_CARD_SETTINGS, sidebarCards, type SidebarCardSetting } from './cards'
import { mergeVisibleOrder, sidebarOrder } from './order'

type LayoutSettings = Pick<ExtensionSettings, 'sidebarLayout' | SidebarCardSetting>

// Shared by the separate Vue apps of the layout controls and every card overlay
export const editingSidebar = ref(false)

// The layout from when editing started, for Revert
let snapshot: LayoutSettings | null = null

async function updateSettings(change: (settings: ExtensionSettings) => Partial<ExtensionSettings>) {
	try {
		const settings = await getSettings()
		await saveSettings({ ...settings, ...change(settings) })
	} catch (err) {
		console.error('[Modrinth Extras] Failed to save sidebar layout:', err)
	}
}

export async function startSidebarEditing(): Promise<void> {
	const settings = await getSettings()
	snapshot = Object.fromEntries(
		(['sidebarLayout', ...SIDEBAR_CARD_SETTINGS] as const).map((key) => [key, settings[key]]),
	) as LayoutSettings
	editingSidebar.value = true
}

export function finishSidebarEditing(): void {
	snapshot = null
	editingSidebar.value = false
}

export async function revertSidebarEditing(): Promise<void> {
	const saved = snapshot
	finishSidebarEditing()
	if (saved) await updateSettings(() => saved)
}

export async function saveSidebarOrder(sidebar: Element): Promise<void> {
	const visible = sidebarCards(sidebar).map((card) => card.id)
	await updateSettings((settings) => ({
		sidebarLayout: { order: mergeVisibleOrder(sidebarOrder(settings), visible) },
	}))
}

export async function setSidebarCardEnabled(
	setting: SidebarCardSetting,
	enabled: boolean,
): Promise<void> {
	await updateSettings((settings) => ({ [setting]: { ...settings[setting], enabled } }))
}
