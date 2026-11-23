import { browser } from 'wxt/browser'

import { getSettings, type ExtensionSettings } from '../core/settings'
import {
	SEARCH_RESULT_ORIGINS,
	SEARCH_RESULTS_SCRIPT_ID,
} from '../features/curseforge-integration/search-hosts'

type SearchResultsSettings = ExtensionSettings['curseforgeIntegration']

// The search engines are an optional permission, so their script is registered only
// while the integration and its search results option are on, and access was granted.
// Declaring it in the manifest instead would ask every user for search engine access
// on install and update.
export async function syncSearchResultsScript(override?: SearchResultsSettings): Promise<void> {
	try {
		const [settings, granted, registered] = await Promise.all([
			getSettings(),
			browser.permissions.contains({ origins: SEARCH_RESULT_ORIGINS }),
			browser.scripting.getRegisteredContentScripts({ ids: [SEARCH_RESULTS_SCRIPT_ID] }),
		])
		// The value that changed is passed in, so a stale settings cache can't flip it
		const state = override ?? settings.curseforgeIntegration
		const wanted = granted && state.enabled && state.searchResults
		const active = registered.length > 0
		if (wanted && !active) {
			await browser.scripting.registerContentScripts([
				{
					id: SEARCH_RESULTS_SCRIPT_ID,
					matches: SEARCH_RESULT_ORIGINS,
					js: ['search-results.js'],
					runAt: 'document_idle',
				},
			])
			console.log('[Modrinth Extras] CurseForge search results: content script registered')
		} else if (!wanted && active) {
			await browser.scripting.unregisterContentScripts({ ids: [SEARCH_RESULTS_SCRIPT_ID] })
			console.log('[Modrinth Extras] CurseForge search results: content script unregistered')
		}
	} catch (err) {
		console.error('[Modrinth Extras] Failed to sync the search results script:', err)
	}
}
