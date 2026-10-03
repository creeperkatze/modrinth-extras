import type { Labrinth } from '@modrinth/api-client'

import { modrinthClient } from './api'

export type Platform = 'curseforge' | 'hangar' | 'spigot'

// A project or author located on another platform.
export interface PlatformMatch {
	platform: Platform
	name: string
	url: string
	iconUrl: string | null
	downloads?: number
}

// A Modrinth project as other platforms are matched against it.
export interface MatchableProject {
	name: string
	slug: string
	authors: string[]
}

// A search result from another platform.
export interface MatchCandidate<T> {
	item: T
	name: string
	slug?: string
	authors: string[]
}

export async function getMatchableProject(
	project: Labrinth.Projects.v3.Project,
): Promise<MatchableProject> {
	const [members, organization] = await Promise.all([
		modrinthClient.labrinth.projects_v3.getMembers(project.id),
		modrinthClient.labrinth.projects_v3.getOrganization(project.id),
	])
	const people = [...members, ...(organization?.members ?? [])].map(
		(member) => member.user.username,
	)

	return {
		name: project.name,
		slug: project.slug ?? project.id,
		authors: organization ? [organization.name, organization.slug, ...people] : people,
	}
}

function normalizeName(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]/g, '')
}

// Strict on purpose: Hangar ranks "EssentialsX_Selectors" first for "EssentialsX".
export function namesMatch(a: string, b: string): boolean {
	const normalized = normalizeName(a)
	return normalized.length > 0 && normalized === normalizeName(b)
}

// Exact means the same name or slug. A longer name that starts with the project's still counts.
export function nameMatch(
	project: MatchableProject,
	candidate: { name: string; slug?: string },
): 'exact' | 'prefix' | null {
	const name = normalizeName(project.name)
	if (!name) return null

	const candidateName = normalizeName(candidate.name)
	const sameSlug = !!candidate.slug && normalizeName(candidate.slug) === normalizeName(project.slug)
	if (candidateName === name || sameSlug) return 'exact'
	return candidateName.startsWith(name) ? 'prefix' : null
}

// Some authors write a capital I for an l, like "WiIIiam278".
function normalizePerson(name: string): string {
	return name
		.toLowerCase()
		.replace(/l/g, 'i')
		.replace(/[^a-z]/g, '')
}

// Platforms spell the same person a little differently, like "jellysquid3" and "JellySquid".
function samePerson(a: string, b: string): boolean {
	const x = normalizePerson(a)
	const y = normalizePerson(b)
	if (x.length < 3 || y.length < 3) return false
	if (x === y) return true

	const [shorter, longer] = x.length < y.length ? [x, y] : [y, x]
	return shorter.length >= 4 && longer.includes(shorter)
}

// Candidates are expected in the platform's popularity order.
export function matchProject<T>(
	project: MatchableProject,
	candidates: MatchCandidate<T>[],
): T | null {
	const matches = candidates.flatMap((candidate) => {
		const match = nameMatch(project, candidate)
		const sameAuthor = candidate.authors.some((author) =>
			project.authors.some((projectAuthor) => samePerson(author, projectAuthor)),
		)
		return match && sameAuthor ? [{ item: candidate.item, exact: match === 'exact' }] : []
	})

	return (matches.find((match) => match.exact) ?? matches[0])?.item ?? null
}
