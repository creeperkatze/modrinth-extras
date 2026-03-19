import { apiFetch } from '../helpers/apiFetch'
import { loadSettings } from '../helpers/settings'

interface ModrinthProject {
	slug: string
	project_type: string
}

interface ModrinthSearchHit {
	slug: string
	project_type: string
	author: string
}

interface ModrinthSearchResult {
	hits: ModrinthSearchHit[]
}

async function apiGet<T>(path: string): Promise<T | null> {
	try {
		return (await apiFetch(path)) as T
	} catch {
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
	// Try JSON-LD structured data first
	for (const script of document.querySelectorAll<HTMLScriptElement>(
		'script[type="application/ld+json"]',
	)) {
		try {
			const data = JSON.parse(script.textContent ?? '')
			if (typeof data.author?.name === 'string') return data.author.name
			if (Array.isArray(data.author) && typeof data.author[0]?.name === 'string')
				return data.author[0].name
		} catch {
			// continue
		}
	}

	// Fallback, try common DOM selectors for CurseForge author
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
	// Capture title immediately so we can detect when SPA has rendered the new page
	const titleAtNavigation = document.title

	const settings = await loadSettings()
	if (!settings.curseforgeRedirect) {
		return
	}

	const match = window.location.pathname.match(
		/^\/minecraft\/(?:mc-mods|modpacks|shaders|bukkit-plugins|texture-packs|data-packs)\/([^/]+)/,
	)
	if (!match) return

	const slug = match[1]
	console.log(`[Modrinth Extras] CurseForge redirect: trying slug "${slug}"`)

	// Try the CurseForge slug directly on Modrinth (no DOM needed)
	const direct = await apiGet<ModrinthProject>(`project/${slug}`)
	if (direct) {
		console.log(
			`[Modrinth Extras] CurseForge redirect: direct slug match, redirecting to ${direct.project_type}/${direct.slug}`,
		)
		window.location.href = `https://modrinth.com/${direct.project_type}/${direct.slug}`
		return
	}

	console.log('[Modrinth Extras] CurseForge redirect: no direct slug match, falling back to search')

	// For SPA navigation, wait for React to render the new page before reading the DOM
	if (waitForDom) {
		await waitForTitleChange(titleAtNavigation)
	}

	// Search by project title, verify author to avoid false redirects
	const title = getCurseForgeTitle()
	const cfAuthor = getCurseForgeAuthor()

	// Skip if we cant verify the author
	if (!cfAuthor) {
		console.log(
			'[Modrinth Extras] CurseForge redirect: could not determine author, aborting to avoid false redirect',
		)
		return
	}

	const searchResult = await apiGet<ModrinthSearchResult>(
		`search?query=${encodeURIComponent(title)}&limit=5`,
	)
	if (!searchResult?.hits?.length) {
		console.log(`[Modrinth Extras] CurseForge redirect: no search results for "${title}"`)
		return
	}

	console.log(
		`[Modrinth Extras] CurseForge redirect: ${searchResult.hits.length} result(s), checking authors`,
	)
	for (const hit of searchResult.hits) {
		if (roughlyMatches(cfAuthor, hit.author)) {
			console.log(
				`[Modrinth Extras] CurseForge redirect: author match CF "${cfAuthor}" ~ Modrinth "${hit.author}", redirecting to ${hit.project_type}/${hit.slug}`,
			)
			window.location.href = `https://modrinth.com/${hit.project_type}/${hit.slug}`
			return
		}
	}

	console.log('[Modrinth Extras] CurseForge redirect: no author match found, not redirecting')
}

export default defineContentScript({
	matches: ['https://www.curseforge.com/*'],
	runAt: 'document_idle',

	main() {
		console.log('[Modrinth Extras] CurseForge redirect: content script loaded')

		// The curseforge bridge patches dispatches this event on navigation
		window.addEventListener('modrinth-extras:cf-navigated', () => {
			console.log(
				`[Modrinth Extras] CurseForge redirect: SPA navigation detected to ${window.location.pathname}`,
			)
			tryRedirect(true)
		})

		// Initial page load
		tryRedirect()
	},
})
