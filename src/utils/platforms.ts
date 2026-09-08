export type Platform = 'curseforge' | 'hangar' | 'spigot'

export const PLATFORM_LABELS: Record<Platform, string> = {
	curseforge: 'CurseForge',
	hangar: 'Hangar',
	spigot: 'SpigotMC',
}

// A project or author located on another platform.
export interface PlatformMatch {
	platform: Platform
	name: string
	url: string
	iconUrl: string | null
	downloads?: number
}

export function normalizeName(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Strict on purpose: Hangar ranks "EssentialsX_Selectors" first for "EssentialsX".
export function namesMatch(a: string, b: string): boolean {
	const normalized = normalizeName(a)
	return normalized.length > 0 && normalized === normalizeName(b)
}

// Prefers a name match over a slug match, since platforms disagree on slugs more often.
export function pickBestMatch<T>(
	candidates: T[],
	getName: (candidate: T) => string,
	getSlug: (candidate: T) => string | undefined,
	title: string,
	slug: string,
): T | null {
	return (
		candidates.find((candidate) => namesMatch(getName(candidate), title)) ??
		candidates.find((candidate) => {
			const candidateSlug = getSlug(candidate)
			return candidateSlug ? namesMatch(candidateSlug, slug) : false
		}) ??
		null
	)
}
