import { type Labrinth, ModrinthApiError } from '@modrinth/api-client'

import { modrinthClient } from '../helpers/api'
import { getSettings } from '../helpers/settings'

async function getProjectBySlug(slug: string): Promise<Labrinth.Projects.v3.Project | null> {
	try {
		return await modrinthClient.labrinth.projects_v3.get(slug)
	} catch (err) {
		if (err instanceof ModrinthApiError && err.statusCode === 404) return null
		console.error(`[Modrinth Extras] CurseForge redirect: Failed to fetch project "${slug}":`, err)
		return null
	}
}

async function searchProjects(title: string): Promise<Labrinth.Projects.v2.SearchResult | null> {
	try {
		return await modrinthClient.labrinth.projects_v2.search({ query: title, limit: 5 })
	} catch (err) {
		console.error(`[Modrinth Extras] CurseForge redirect: Failed to search for "${title}":`, err)
		return null
	}
}

function normalize(s: string): string {
	return s.toLowerCase().replace(/[^a-z0-9]/g, '')
}

function roughlyMatches(a: string, b: string): boolean {
	const na = normalize(a)
	const nb = normalize(b)
	if (!na || !nb) return false
	return na === nb || na.includes(nb) || nb.includes(na)
}

function getCurseForgeAuthor(): string {
	// Prefer structured metadata before falling back to CurseForge's rendered markup
	for (const script of document.querySelectorAll<HTMLScriptElement>(
		'script[type="application/ld+json"]',
	)) {
		try {
			const data = JSON.parse(script.textContent ?? '')
			if (typeof data.author?.name === 'string') return data.author.name
			if (Array.isArray(data.author) && typeof data.author[0]?.name === 'string')
				return data.author[0].name
		} catch {
			continue
		}
	}

	const selectors = [
		'a.author-name',
		'.author-name',
		'.project-author a',
		'.project-members-wrapper a.name',
		'[data-author]',
	]
	for (const sel of selectors) {
		const el = document.querySelector(sel)
		if (el) {
			const text = (el.textContent ?? el.getAttribute('data-author') ?? '').trim()
			if (text) return text
		}
	}
	return ''
}

function getCurseForgeTitle(): string {
	const og = document.querySelector<HTMLMetaElement>('meta[property="og:title"]')?.content
	if (og?.trim()) return og.trim()
	return document.title.split(' - ')[0].trim()
}

function waitForTitleChange(oldTitle: string): Promise<void> {
	if (document.title !== oldTitle) return Promise.resolve()
	return new Promise((resolve) => {
		const titleEl = document.querySelector('title') ?? document.head
		const observer = new MutationObserver(() => {
			if (document.title !== oldTitle) {
				observer.disconnect()
				resolve()
			}
		})
		observer.observe(titleEl, { subtree: true, characterData: true, childList: true })
		setTimeout(() => {
			observer.disconnect()
			resolve()
		}, 3000)
	})
}

async function tryRedirect(waitForDom = false): Promise<void> {
	const titleAtNavigation = document.title

	const settings = await getSettings()
	if (!settings.curseforgeRedirect.enabled) {
		return
	}

	const match = window.location.pathname.match(
		/^\/minecraft\/(?:mc-mods|modpacks|shaders|bukkit-plugins|texture-packs|data-packs)\/([^/]+)/,
	)
	if (!match) return

	const slug = match[1]
	console.log(`[Modrinth Extras] CurseForge redirect: Trying slug "${slug}"`)

	const direct = await getProjectBySlug(slug)
	if (direct) {
		const projectType = direct.project_types[0]
		if (!projectType || !direct.slug) return
		console.log(
			`[Modrinth Extras] CurseForge redirect: Direct slug match, redirecting to ${projectType}/${direct.slug}`,
		)
		window.location.href = `https://modrinth.com/${projectType}/${direct.slug}`
		return
	}

	console.log('[Modrinth Extras] CurseForge redirect: No direct slug match, falling back to search')

	// Wait for CurseForge's SPA navigation to finish before reading the new page metadata
	if (waitForDom) {
		await waitForTitleChange(titleAtNavigation)
	}

	const title = getCurseForgeTitle()
	const cfAuthor = getCurseForgeAuthor()

	if (!cfAuthor) {
		console.log(
			'[Modrinth Extras] CurseForge redirect: Could not determine author, aborting to avoid false redirect',
		)
		return
	}

	const searchResult = await searchProjects(title)
	if (!searchResult?.hits?.length) {
		console.log(`[Modrinth Extras] CurseForge redirect: No search results for "${title}"`)
		return
	}

	console.log(
		`[Modrinth Extras] CurseForge redirect: ${searchResult.hits.length} result(s), checking authors`,
	)
	for (const hit of searchResult.hits) {
		if (roughlyMatches(cfAuthor, hit.author)) {
			console.log(
				`[Modrinth Extras] CurseForge redirect: Author match for CurseForge author "${cfAuthor}": "${hit.author}", redirecting to ${hit.project_type}/${hit.slug}`,
			)
			window.location.href = `https://modrinth.com/${hit.project_type}/${hit.slug}`
			return
		}
	}

	console.log('[Modrinth Extras] CurseForge redirect: No author match found, not redirecting')
}

export default defineContentScript({
	matches: ['https://www.curseforge.com/*'],
	runAt: 'document_idle',

	main() {
		console.log('[Modrinth Extras] CurseForge redirect: content script loaded')

		window.addEventListener('modrinth-extras:cf-navigated', () => {
			console.log(
				`[Modrinth Extras] CurseForge redirect: SPA navigation detected to ${window.location.pathname}`,
			)
			tryRedirect(true)
		})

		tryRedirect()
	},
})
