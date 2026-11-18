export type PlatformPage =
	| { platform: 'curseforge'; slug: string }
	| { platform: 'hangar'; owner: string; slug: string }
	| { platform: 'spigot'; id: number }

// The Modrinth project found for a project page on another platform.
export interface ModrinthMatch {
	slug: string
	name: string
	iconUrl: string | null
	downloads: number
	projectType: string
}

const CURSEFORGE_PATTERN =
	/^\/minecraft\/(?:mc-mods|modpacks|shaders|bukkit-plugins|texture-packs|data-packs)\/([^/?#]+)/
// Resource URLs look like /resources/luckperms.28140/ or just /resources/28140/
const SPIGOT_PATTERN = /^\/resources\/(?:[^/]*\.)?(\d+)(?:\/|$)/
const HANGAR_PATTERN = /^\/([^/?#]+)\/([^/?#]+)/
// Top level pages that would otherwise look like an owner and project
const HANGAR_RESERVED = new Set([
	'api',
	'auth',
	'admin',
	'tools',
	'staff',
	'notifications',
	'linkout',
])

export function parsePlatformPage(url: string): PlatformPage | null {
	let parsed: URL
	try {
		parsed = new URL(url)
	} catch {
		return null
	}

	if (parsed.hostname === 'www.curseforge.com') {
		const slug = parsed.pathname.match(CURSEFORGE_PATTERN)?.[1]
		return slug ? { platform: 'curseforge', slug } : null
	}
	if (parsed.hostname === 'www.spigotmc.org') {
		const id = parsed.pathname.match(SPIGOT_PATTERN)?.[1]
		return id ? { platform: 'spigot', id: Number(id) } : null
	}
	if (parsed.hostname === 'hangar.papermc.io') {
		const [, owner, slug] = parsed.pathname.match(HANGAR_PATTERN) ?? []
		if (!owner || !slug || HANGAR_RESERVED.has(owner.toLowerCase())) return null
		return { platform: 'hangar', owner, slug }
	}
	return null
}
