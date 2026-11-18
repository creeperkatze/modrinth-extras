<template>
	<div class="flex min-h-0 flex-1 flex-col">
		<div class="shrink-0 px-3 pt-3">
			<Input
				ref="searchInput"
				v-model="query"
				:icon="SearchIcon"
				:placeholder="formatMessage(messages['popup.search.placeholder'])"
				:clear-label="formatMessage(messages['popup.search.clear'])"
				clearable
				autocomplete="off"
				:spellcheck="false"
				wrapper-class="w-full"
				@keydown="onKeydown"
			/>
		</div>

		<PopupScroll>
			<PopupSection v-if="searching" :title="formatMessage(messages['popup.search.results'])">
				<template #actions>
					<Button size="xs" type="quiet" @click="openSearchPage">
						{{ formatMessage(messages['popup.search.openOnModrinth']) }}
						<ArrowUpRightIcon aria-hidden="true" />
					</Button>
				</template>
				<div
					v-if="resultsLoading && results.length === 0"
					class="flex items-center gap-2 p-3 text-sm text-secondary"
				>
					<SpinnerIcon class="size-4 animate-spin" aria-hidden="true" />
					{{ formatMessage(messages['popup.search.searching']) }}
				</div>
				<div v-else-if="resultsFailed" class="p-3 text-sm text-secondary">
					{{ formatMessage(messages['popup.search.failed']) }}
				</div>
				<div v-else-if="results.length === 0" class="p-3 text-sm text-secondary">
					{{ formatMessage(messages['popup.search.noResults']) }}
				</div>
				<ProjectRow
					v-for="(hit, index) in results"
					:key="hit.project_id"
					:name="hit.name"
					:icon-url="hit.icon_url"
					:href="modrinthUrl(projectPath(hitType(hit), hit.slug ?? hit.project_id))"
					:selected="index === selectedIndex"
					@open="openResult(hit)"
				>
					<template #meta>
						<span class="truncate">{{ hit.author }}</span>
						<span aria-hidden="true">·</span>
						<DownloadIcon class="size-3 shrink-0" aria-hidden="true" />
						<span>{{ formatCompactNumber(hit.downloads) }}</span>
					</template>
					<template #actions>
						<QuickDownloadButton :slug="hit.slug ?? hit.project_id" :project-type="hitType(hit)" />
					</template>
				</ProjectRow>
			</PopupSection>

			<template v-else>
				<FoundOnModrinth />
				<PopupSection
					v-if="recentSearches.length > 0"
					:title="formatMessage(messages['popup.search.recent'])"
					:icon="HistoryIcon"
				>
					<template #actions>
						<IconButton
							v-tooltip="formatMessage(messages['popup.search.clearRecent'])"
							size="sm"
							type="quiet"
							:label="formatMessage(messages['popup.search.clearRecent'])"
							@click="clearRecentSearches"
						>
							<TrashIcon aria-hidden="true" />
						</IconButton>
					</template>
					<button
						v-for="search in recentSearches"
						:key="search.label"
						type="button"
						class="m-0 flex w-full cursor-pointer items-center gap-2 border-0 bg-transparent px-3 py-2 text-left text-sm text-primary transition-colors hover:bg-surface-4"
						@click="useRecentSearch(search.label)"
					>
						<HistoryIcon class="size-4 shrink-0 text-secondary" aria-hidden="true" />
						<span class="truncate">{{ search.label }}</span>
					</button>
				</PopupSection>
			</template>
		</PopupScroll>
	</div>
</template>

<script setup lang="ts">
import type { Labrinth } from '@modrinth/api-client'
import {
	ArrowUpRightIcon,
	DownloadIcon,
	HistoryIcon,
	SearchIcon,
	SpinnerIcon,
	TrashIcon,
} from '@modrinth/assets'
import { Button, defineMessages, IconButton, Input, useCompactNumber, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'

import {
	type RecentSearch,
	recentSearchesItem,
	withRecentSearch,
} from '../../../features/search/recent-searches'
import PopupScroll from '../components/PopupScroll.vue'
import PopupSection from '../components/PopupSection.vue'
import ProjectRow from '../components/ProjectRow.vue'
import QuickDownloadButton from '../components/QuickDownloadButton.vue'
import { searchPageUrl, searchProjects } from '../search/search'
import { projectPath } from '../utils/projects'
import { modrinthUrl, openModrinth } from '../utils/tabs'
import FoundOnModrinth from './search/FoundOnModrinth.vue'

const RESULT_LIMIT = 15
const SEARCH_DELAY_MS = 250

const { formatMessage } = useVIntl()
const { formatCompactNumber } = useCompactNumber()

const messages = defineMessages({
	'popup.search.placeholder': {
		id: 'popup.search.placeholder',
		defaultMessage: 'Search Modrinth',
	},
	'popup.search.clear': {
		id: 'popup.search.clear',
		defaultMessage: 'Clear search',
	},
	'popup.search.results': {
		id: 'popup.search.results',
		defaultMessage: 'Results',
	},
	'popup.search.openOnModrinth': {
		id: 'popup.search.openOnModrinth',
		defaultMessage: 'Open on Modrinth',
	},
	'popup.search.searching': {
		id: 'popup.search.searching',
		defaultMessage: 'Searching...',
	},
	'popup.search.failed': {
		id: 'popup.search.failed',
		defaultMessage: 'Search failed. Try again in a moment.',
	},
	'popup.search.noResults': {
		id: 'popup.search.noResults',
		defaultMessage: 'No projects found',
	},
	'popup.search.recent': {
		id: 'popup.search.recent',
		defaultMessage: 'Recent searches',
	},
	'popup.search.clearRecent': {
		id: 'popup.search.clearRecent',
		defaultMessage: 'Clear recent searches',
	},
})

const searchInput = useTemplateRef<InstanceType<typeof Input>>('searchInput')
const query = ref('')
const trimmedQuery = computed(() => query.value.trim().split(/\s+/).join(' '))
const searching = computed(() => trimmedQuery.value.length > 0)

const results = shallowRef<Labrinth.Search.v3.ResultSearchProject[]>([])
const resultsLoading = ref(false)
const resultsFailed = ref(false)
const selectedIndex = ref(-1)

let searchTimer: ReturnType<typeof setTimeout> | undefined
let searchId = 0

watch(trimmedQuery, (value) => {
	clearTimeout(searchTimer)
	selectedIndex.value = -1
	if (!value) {
		searchId++
		results.value = []
		resultsLoading.value = false
		return
	}
	resultsLoading.value = true
	searchTimer = setTimeout(() => runSearch(value), SEARCH_DELAY_MS)
})

async function runSearch(value: string) {
	const id = ++searchId
	try {
		const hits = await searchProjects(value, RESULT_LIMIT)
		if (id !== searchId) return
		results.value = hits
		resultsFailed.value = false
	} catch (err) {
		if (id !== searchId) return
		resultsFailed.value = true
		console.error('[Modrinth Extras] Failed to search Modrinth:', err)
	} finally {
		if (id === searchId) resultsLoading.value = false
	}
}

function hitType(hit: Labrinth.Search.v3.ResultSearchProject): string {
	return hit.project_types[0] ?? 'mod'
}

const recentSearches = ref<RecentSearch[]>([])

// Plain text with no filters, which the quick search on the site reads as a normal search
async function saveSearch() {
	if (!trimmedQuery.value) return
	const entry: RecentSearch = { label: trimmedQuery.value, tags: [], query: trimmedQuery.value }
	try {
		await recentSearchesItem.setValue(withRecentSearch(recentSearches.value, entry))
	} catch (err) {
		console.error('[Modrinth Extras] Failed to save recent searches:', err)
	}
}

async function clearRecentSearches() {
	recentSearches.value = []
	try {
		await recentSearchesItem.removeValue()
	} catch (err) {
		console.error('[Modrinth Extras] Failed to clear recent searches:', err)
	}
}

function useRecentSearch(text: string) {
	query.value = text
	searchInput.value?.focus()
}

async function openResult(hit: Labrinth.Search.v3.ResultSearchProject) {
	await saveSearch()
	void openModrinth(projectPath(hitType(hit), hit.slug ?? hit.project_id))
}

async function openSearchPage() {
	await saveSearch()
	void openModrinth(searchPageUrl(trimmedQuery.value))
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'ArrowDown') {
		event.preventDefault()
		selectedIndex.value = Math.min(selectedIndex.value + 1, results.value.length - 1)
	} else if (event.key === 'ArrowUp') {
		event.preventDefault()
		selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
	} else if (event.key === 'Enter' && searching.value) {
		event.preventDefault()
		const hit = results.value[selectedIndex.value]
		if (hit) void openResult(hit)
		else void openSearchPage()
	}
}

onMounted(() => {
	searchInput.value?.focus()
	recentSearchesItem
		.getValue()
		.then((value) => (recentSearches.value = value))
		.catch((err) => console.error('[Modrinth Extras] Failed to load recent searches:', err))
})
</script>
