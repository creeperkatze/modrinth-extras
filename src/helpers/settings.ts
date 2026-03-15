export interface ExtensionSettings {
	showBadge: boolean
	showNotificationsIndicator: boolean
	showToolsSidebar: boolean
	showDependenciesSidebar: boolean
	showActivitySparkline: boolean
	showGitHubSidebar: boolean
	showQuickSearch: boolean
}

export const DEFAULTS: ExtensionSettings = {
	showBadge: true,
	showNotificationsIndicator: true,
	showToolsSidebar: true,
	showDependenciesSidebar: true,
	showActivitySparkline: true,
	showGitHubSidebar: true,
	showQuickSearch: true,
}

import { browser } from 'wxt/browser'

export async function loadSettings(): Promise<ExtensionSettings> {
	const stored = await browser.storage.local.get(Object.keys(DEFAULTS) as string[])
	return { ...DEFAULTS, ...(stored as Partial<ExtensionSettings>) }
}
