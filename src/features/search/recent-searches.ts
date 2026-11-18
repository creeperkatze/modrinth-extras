import { storage } from '@wxt-dev/storage'

export interface RecentSearchTag {
	facet: string
	value: string
}

export interface RecentSearch {
	label: string
	tags: RecentSearchTag[]
	query?: string
}

export const MAX_RECENT_SEARCHES = 6

// Shared by the quick search on the site and the popup, so both show the same history
export const recentSearchesItem = storage.defineItem<RecentSearch[]>('local:recentSearches', {
	defaultValue: [],
})

export function withRecentSearch(recent: RecentSearch[], entry: RecentSearch): RecentSearch[] {
	return [entry, ...recent.filter((search) => search.label !== entry.label)].slice(
		0,
		MAX_RECENT_SEARCHES,
	)
}
