import type { Labrinth } from '@modrinth/api-client'

import type { MatchableProject } from '../src/features/platforms/matching'
import { CASES, type Listings } from './platform-matching-cases.ts'

// The lookups read the version and auth cookie through wxt/browser, which only exists in a browser
Object.assign(globalThis, {
	chrome: {
		runtime: { getManifest: () => ({ version: 'test' }) },
		cookies: { get: async () => null },
	},
})

const { findCurseForgeProject } = await import('../src/background/external/platforms/curseforge')
const { findHangarProject } = await import('../src/background/external/platforms/hangar')
const { findSpigotProject } = await import('../src/background/external/platforms/spigot')
const { getMatchableProject } = await import('../src/features/platforms/matching')

const PLATFORMS = {
	curseforge: {
		find: findCurseForgeProject,
		url: (path: string | number) => `https://www.curseforge.com/minecraft/${path}`,
	},
	hangar: {
		find: findHangarProject,
		url: (path: string | number) => `https://hangar.papermc.io/${path}`,
	},
	spigot: {
		find: findSpigotProject,
		url: (id: string | number) => `https://www.spigotmc.org/resources/${id}/`,
	},
}
type Platform = keyof typeof PLATFORMS
const platforms = Object.keys(PLATFORMS) as Platform[]

async function getProject(slug: string): Promise<Labrinth.Projects.v3.Project> {
	const response = await fetch(`https://api.modrinth.com/v3/project/${slug}`, {
		headers: { 'User-Agent': 'creeperkatze/modrinth-extras/test-platform-matching' },
	})
	if (!response.ok) throw new Error(`Modrinth returned ${response.status} for ${slug}`)
	return response.json()
}

// Some APIs answer errors with a whole HTML page
function describe(err: unknown): string {
	const message = err instanceof Error ? err.message : String(err)
	return `failed: ${message.split('\n')[0]?.slice(0, 160)}`
}

async function check(
	project: MatchableProject,
	platform: Platform,
	listings: (string | number)[],
): Promise<string | null> {
	const { find, url } = PLATFORMS[platform]
	const accepted = listings.map(url)
	try {
		const got = (await find(project))?.url ?? null
		if (got === null ? accepted.length === 0 : accepted.includes(got)) return null
		return `expected ${accepted.join(' or ') || 'no match'}, got ${got ?? 'no match'}`
	} catch (err) {
		return describe(err)
	}
}

async function attempt(slug: string, listings: Listings): Promise<(string | null)[]> {
	try {
		const project = await getMatchableProject(await getProject(slug))
		return await Promise.all(
			platforms.map((platform) => check(project, platform, listings[platform])),
		)
	} catch (err) {
		return platforms.map(() => describe(err))
	}
}

// Projects run one at a time to stay under Modrinth's rate limit, and rate limited ones are retried
async function run(slug: string, listings: Listings): Promise<(string | null)[]> {
	for (let retry = 0; ; retry++) {
		const problems = await attempt(slug, listings)
		if (retry === 3 || !problems.some((problem) => problem?.includes('429'))) return problems
		await new Promise((resolve) => setTimeout(resolve, 60_000))
	}
}

const failures: string[] = []
for (const [slug, listings] of Object.entries(CASES)) {
	const problems = await run(slug, listings)
	const marks = platforms.map((platform, i) => `${platform} ${problems[i] ? '✗' : '✓'}`)
	console.log(`${slug.padEnd(32)} ${marks.join('  ')}`)
	platforms.forEach((platform, i) => {
		if (problems[i]) failures.push(`${slug} on ${platform}: ${problems[i]}`)
	})
}

const checks = Object.keys(CASES).length * platforms.length
console.log(`\n${checks - failures.length}/${checks} checks passed`)
if (failures.length) {
	console.log(`\n${failures.join('\n')}`)
	process.exit(1)
}
