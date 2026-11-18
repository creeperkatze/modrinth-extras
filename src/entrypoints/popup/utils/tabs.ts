import { browser } from 'wxt/browser'

export async function getActiveTab() {
	const [tab] = await browser.tabs.query({ active: true, currentWindow: true })
	return tab
}

export function modrinthUrl(path: string): string {
	return path.startsWith('http') ? path : `https://modrinth.com${path}`
}

export async function openUrl(url: string) {
	await browser.tabs.create({ url })
	window.close()
}

// An open Modrinth tab navigates in place like a normal link, anything else gets a new tab
export async function openModrinth(path: string) {
	const url = modrinthUrl(path)
	const tab = await getActiveTab()
	if (tab?.id !== undefined && tab.url?.startsWith('https://modrinth.com/')) {
		try {
			const response = await browser.tabs.sendMessage(tab.id, { type: 'navigate', path: url })
			if (response?.ok) {
				window.close()
				return
			}
		} catch {
			// The page has no content script yet, for example right after an update
		}
	}
	await openUrl(url)
}
