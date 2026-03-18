export interface ExtensionSettings {
	showBadge: boolean
	desktopNotifications: boolean
	showNotificationsIndicator: boolean
	showToolsSidebar: boolean
	showDependenciesSidebar: boolean
	showActivitySparkline: boolean
	showGitHubSidebar: boolean
	showDiscordSidebar: boolean
	showQuickSearch: boolean
}

export const DEFAULTS: ExtensionSettings = {
	showBadge: true,
	desktopNotifications: false,
	showNotificationsIndicator: true,
	showToolsSidebar: true,
	showDependenciesSidebar: true,
	showActivitySparkline: true,
	showGitHubSidebar: true,
	showDiscordSidebar: true,
	showQuickSearch: true,
}

import { browser } from 'wxt/browser'

export async function loadSettings(): Promise<ExtensionSettings> {
	const stored = await browser.storage.local.get(Object.keys(DEFAULTS) as string[])
	return { ...DEFAULTS, ...(stored as Partial<ExtensionSettings>) }
}
