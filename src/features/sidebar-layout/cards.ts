import type { ExtensionSettings } from '../../core/settings'

// Keyed by the setting that turns each card on, in their default order
export const SIDEBAR_CARD_IDS = {
	toolsSidebar: 'modrinth-extras-tools-sidebar',
	dependencySidebar: 'modrinth-extras-dependency-sidebar',
	modpacksSidebar: 'modrinth-extras-modpacks-sidebar',
	platformsSidebar: 'modrinth-extras-platforms-sidebar',
	githubSidebar: 'modrinth-extras-repository-sidebar',
	discordSidebar: 'modrinth-extras-discord-sidebar',
} as const satisfies Partial<Record<keyof ExtensionSettings, string>>

export type SidebarCardSetting = keyof typeof SIDEBAR_CARD_IDS

export const SIDEBAR_CARD_SETTINGS = Object.keys(SIDEBAR_CARD_IDS) as SidebarCardSetting[]

export const SIDEBAR_LAYOUT_ID = 'modrinth-extras-sidebar-layout'

export function sidebarCardSetting(element: Element): SidebarCardSetting | undefined {
	return SIDEBAR_CARD_SETTINGS.find((setting) => SIDEBAR_CARD_IDS[setting] === element.id)
}

export function sidebarCards(sidebar: Element): HTMLElement[] {
	return [...sidebar.children].filter(
		(child): child is HTMLElement => child instanceof HTMLElement && !!sidebarCardSetting(child),
	)
}
