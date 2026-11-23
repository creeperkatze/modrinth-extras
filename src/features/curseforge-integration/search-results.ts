import { type App, createApp } from 'vue'
import { browser } from 'wxt/browser'

import SearchResultLink from '../../components/curseforge/SearchResultLink.vue'
import { detectBrowserLocale, i18n, installI18n } from '../../core/i18n/i18n'
import type { ExtensionSettings } from '../../core/settings'
import { followSettingsChanges, loadSettingsStore, useSettings } from '../../core/settings-store'
import { installErrorReporting } from '../../core/telemetry'
import { parsePlatformPage } from '../platforms/pages'
import { type CurseForgeSearchResult, findCurseForgeSearchResults } from './search-engines'
import { injectStyles } from './styles'
import { EXTERNAL_UI_CLASS } from './ui-class'

const injected = new Map<HTMLElement, { app: App; element: HTMLElement }>()
// Hidden results with the inline display they had before
const hidden = new Map<HTMLElement, string>()
let processed = new WeakMap<HTMLAnchorElement, string>()
let generation = 0
let observer: MutationObserver | null = null
let scanTimer: ReturnType<typeof setTimeout> | undefined
let style: HTMLStyleElement | null = null

function hideResult(container: HTMLElement) {
	if (hidden.has(container)) return
	hidden.set(container, container.style.display)
	container.style.setProperty('display', 'none', 'important')
}

function showResult(container: HTMLElement) {
	const display = hidden.get(container)
	if (display === undefined) return
	container.style.display = display
	hidden.delete(container)
}

function clearResult(container: HTMLElement) {
	showResult(container)
	const current = injected.get(container)
	if (current) {
		current.app.unmount()
		current.element.remove()
		injected.delete(container)
	}
}

function restoreResults() {
	generation++
	for (const container of hidden.keys()) showResult(container)
	for (const { app, element } of injected.values()) {
		app.unmount()
		element.remove()
	}
	injected.clear()
	processed = new WeakMap()
}

function cleanupDetached() {
	for (const container of injected.keys()) {
		if (!container.isConnected) clearResult(container)
	}
	for (const container of hidden.keys()) {
		if (!container.isConnected) hidden.delete(container)
	}
}

async function resolveResultUrl(url: string): Promise<string | null> {
	try {
		const response = (await browser.runtime.sendMessage({
			type: 'resolve-curseforge-search-result',
			url,
		})) as { ok?: boolean; url?: string }
		return response.ok && response.url ? response.url : null
	} catch (err) {
		console.error('[Modrinth Extras] CurseForge search: Failed to resolve a result:', err)
		return null
	}
}

async function findModrinthUrl(slug: string): Promise<string | null> {
	try {
		const response = (await browser.runtime.sendMessage({
			type: 'modrinth-match',
			page: { platform: 'curseforge', slug },
		})) as { ok?: boolean; match?: { projectType: string; slug: string } }
		if (!response.ok || !response.match) return null
		return `https://modrinth.com/${response.match.projectType}/${response.match.slug}`
	} catch (err) {
		console.error('[Modrinth Extras] CurseForge search: Failed to find a match:', err)
		return null
	}
}

function mountLink(container: HTMLElement, url: string) {
	if (injected.has(container)) return
	const element = document.createElement('aside')
	element.className = EXTERNAL_UI_CLASS
	const app = createApp(SearchResultLink, { url })
	installErrorReporting(app)
	installI18n(app)
	container.prepend(element)
	app.mount(element)
	injected.set(container, { app, element })
}

async function processResult(
	result: CurseForgeSearchResult,
	settings: ExtensionSettings,
	run: number,
) {
	const { anchor, container, url, unresolved } = result
	let page = result.page
	if (processed.get(anchor) === url) return
	const previousUrl = processed.get(anchor)
	processed.set(anchor, url)
	if (previousUrl) clearResult(container)

	if (!settings.curseforgeIntegration.searchResults) return
	if (settings.curseforgeIntegration.searchResultsAction === 'hide') {
		hideResult(container)
		return
	}

	if (unresolved) {
		const resolved = await resolveResultUrl(anchor.href)
		if (run !== generation || !resolved) return
		const parsed = parsePlatformPage(resolved)
		page = parsed?.platform === 'curseforge' ? parsed : null
	}
	if (!page) return

	const modrinthUrl = await findModrinthUrl(page.slug)
	if (run !== generation || !container.isConnected || !modrinthUrl) return
	mountLink(container, modrinthUrl)
}

async function scan() {
	scanTimer = undefined
	cleanupDetached()
	const run = generation
	const settings = await loadSettingsStore()
	if (run !== generation) return
	if (!settings.curseforgeIntegration.enabled || !settings.curseforgeIntegration.searchResults)
		return
	for (const result of findCurseForgeSearchResults()) {
		void processResult(result, settings, run).catch((err) => {
			console.error('[Modrinth Extras] CurseForge search: Failed to process a result:', err)
		})
	}
}

function scheduleScan() {
	if (scanTimer !== undefined) return
	scanTimer = setTimeout(() => void scan(), 50)
}

export function startSearchResults(): () => void {
	const settings = useSettings()
	const applyLocale = () => {
		i18n.global.locale.value = settings.locale.value || detectBrowserLocale()
	}
	void loadSettingsStore().then(() => {
		applyLocale()
		scheduleScan()
	})
	const stopFollowingSettings = followSettingsChanges(() => {
		applyLocale()
		restoreResults()
		scheduleScan()
	})

	style = injectStyles()
	observer = new MutationObserver(scheduleScan)
	observer.observe(document.documentElement, {
		childList: true,
		subtree: true,
		attributes: true,
		attributeFilter: ['href'],
	})
	scheduleScan()

	return () => {
		stopFollowingSettings()
		observer?.disconnect()
		observer = null
		if (scanTimer !== undefined) clearTimeout(scanTimer)
		scanTimer = undefined
		restoreResults()
		style?.remove()
		style = null
	}
}
