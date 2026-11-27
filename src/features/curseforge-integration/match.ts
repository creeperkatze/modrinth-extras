import { browser } from 'wxt/browser'

import type { CurseForgePage, ModrinthMatch } from '../platforms/pages'

export async function findModrinthUrl(page: CurseForgePage): Promise<string | null> {
	try {
		const response = (await browser.runtime.sendMessage({ type: 'modrinth-match', page })) as {
			ok?: boolean
			match?: ModrinthMatch | null
		}
		if (!response.ok || !response.match) return null
		return `https://modrinth.com/${response.match.projectType}/${response.match.slug}`
	} catch (err) {
		console.error('[Modrinth Extras] CurseForge integration: Failed to find a match:', err)
		return null
	}
}
