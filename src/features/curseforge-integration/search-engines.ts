import { parsePlatformPage, type PlatformPage } from '../platforms/pages'

interface SearchEngine {
	anchors: string
	container: (anchor: HTMLAnchorElement) => HTMLElement | null
}

export interface CurseForgeSearchResult {
	anchor: HTMLAnchorElement
	container: HTMLElement
	url: string
	page: Extract<PlatformPage, { platform: 'curseforge' }> | null
	unresolved: boolean
}

const ENGINES: Record<string, SearchEngine> = {
	'www.google.com': {
		anchors: '#search a:has(h3)',
		container: (anchor) => anchor.closest('div[data-hveid]'),
	},
	'www.bing.com': {
		anchors: 'li.b_algo h2 a',
		container: (anchor) => anchor.closest('li.b_algo'),
	},
	'duckduckgo.com': {
		anchors: 'h2 > a',
		container: (anchor) => anchor.closest('li[data-layout], div.web-result'),
	},
	'html.duckduckgo.com': {
		anchors: 'h2 > a',
		container: (anchor) => anchor.closest('div.web-result'),
	},
}

const googleTokenUrls = new Map<string, string>()
const scannedGoogleScripts = new WeakSet<HTMLScriptElement>()
const googleGoto = String.raw`"/goto\?url(?:=|\\u003d)([^"]*)"`
const googleRealUrl = String.raw`"(https?://(?:[^"\\]|\\.)*)"`
const googleResultPattern = new RegExp(`${googleGoto}\\],\\[${googleRealUrl}`, 'g')

function googleScriptUrl(token: string): string | null {
	for (const script of document.scripts) {
		if (scannedGoogleScripts.has(script)) continue
		scannedGoogleScripts.add(script)
		const text = script.textContent ?? ''
		if (!text.includes('/goto?url')) continue
		for (const [, linkToken, url] of text.matchAll(googleResultPattern)) {
			if (!linkToken || !url) continue
			try {
				googleTokenUrls.set(linkToken, JSON.parse(`"${url}"`) as string)
			} catch {
				continue
			}
		}
	}
	return googleTokenUrls.get(token) ?? null
}

function decodeBingUrl(value: string): string | null {
	try {
		const encoded = value.replace(/^a1/, '').replace(/-/g, '+').replace(/_/g, '/')
		const bytes = Uint8Array.from(atob(encoded), (char) => char.charCodeAt(0))
		return new TextDecoder().decode(bytes)
	} catch {
		return null
	}
}

function resolveDestination(anchor: HTMLAnchorElement): string | null {
	try {
		const url = new URL(anchor.href, window.location.href)
		if (url.hostname === 'translate.google.com') return url.searchParams.get('u')
		if (url.hostname === 'www.google.com' && ['/url', '/goto'].includes(url.pathname)) {
			const target = url.searchParams.get('url') ?? url.searchParams.get('q') ?? ''
			if (/^https?:\/\//.test(target)) return target
			return googleScriptUrl(target)
		}
		if (url.hostname === 'www.bing.com' && url.pathname.startsWith('/ck/')) {
			return decodeBingUrl(url.searchParams.get('u') ?? '')
		}
		if (url.hostname.endsWith('duckduckgo.com')) {
			return url.searchParams.get('uddg') ?? url.href
		}
		return url.href
	} catch {
		return null
	}
}

function isCurseForge(url: string | null): url is string {
	if (!url) return false
	try {
		return new URL(url).hostname === 'www.curseforge.com'
	} catch {
		return false
	}
}

function isGoogleRedirect(anchor: HTMLAnchorElement): boolean {
	try {
		const url = new URL(anchor.href)
		return url.hostname === 'www.google.com' && ['/url', '/goto'].includes(url.pathname)
	} catch {
		return false
	}
}

function breadcrumbUrl(container: HTMLElement): string | null {
	const cite = container.querySelector('cite')?.textContent
	if (!cite?.includes('curseforge.com')) return null
	const parts = cite
		.split('›')
		.map((part) => part.trim())
		.filter(Boolean)
	if (!parts.length) return null
	const path = parts.join('/')
	return /^https?:\/\//.test(path) ? path : `https://${path}`
}

export function findCurseForgeSearchResults(): CurseForgeSearchResult[] {
	const engine = ENGINES[window.location.hostname]
	if (!engine) return []
	return [...document.querySelectorAll<HTMLAnchorElement>(engine.anchors)].flatMap((anchor) => {
		const container = engine.container(anchor)
		if (!container) return []
		const destination = resolveDestination(anchor)
		const url = [destination, breadcrumbUrl(container)].find(isCurseForge)
		if (!url) return []
		const parsed = parsePlatformPage(url)
		const page = parsed?.platform === 'curseforge' ? parsed : null
		const unresolved = !isCurseForge(destination) && isGoogleRedirect(anchor)
		return [{ anchor, container, url, page, unresolved }]
	})
}
