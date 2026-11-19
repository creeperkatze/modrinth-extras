<template>
	<div ref="root">
		<!-- The top padding keeps the focus ring visible once it sticks to the top -->
		<div data-sticky-header class="sticky top-0 z-10 bg-bg px-3 pb-3 pt-1">
			<Input
				ref="searchInput"
				v-model="query"
				:icon="SearchIcon"
				:placeholder="
					formatMessage(projectType?.placeholder ?? messages['popup.search.placeholder'])
				"
				:clear-label="formatMessage(messages['popup.search.clear'])"
				clearable
				autocomplete="off"
				:spellcheck="false"
				wrapper-class="w-full"
				@keydown="onKeydown"
			/>
		</div>

		<div class="flex flex-col gap-2 px-3 pb-3">
			<!-- Wraps when a long page range doesn't fit next to the type picker -->
			<div class="flex flex-wrap items-center gap-2">
				<ProjectTypeSelect v-model="projectType" @update:model-value="searchInput?.focus()" />
				<Pagination
					v-if="pageCount > 1"
					class="ml-auto"
					:page="page"
					:count="pageCount"
					@switch-page="goToPage"
				/>
			</div>
			<div
				v-if="resultsLoading && results.length === 0"
				class="flex items-center justify-center gap-2 p-6 text-sm text-secondary"
			>
				<SpinnerIcon class="size-4 animate-spin" aria-hidden="true" />
				{{ formatMessage(messages['popup.search.searching']) }}
			</div>
			<EmptyState
				v-else-if="resultsFailed"
				type="error"
				:heading="formatMessage(messages['popup.search.failedHeading'])"
			>
				<template #actions>
					<Button @click="retrySearch">
						<RefreshCwIcon aria-hidden="true" />
						{{ formatMessage(commonMessages.retryButton) }}
					</Button>
				</template>
			</EmptyState>
			<EmptyState
				v-else-if="results.length === 0"
				type="no-search-result"
				:heading="formatMessage(messages['popup.search.noResults'])"
			/>
			<CompactProjectCard
				v-for="(hit, index) in results"
				:key="hit.project_id"
				ref="resultCards"
				v-bind="hitType(hit, projectType) === SERVER_TYPE ? serverStats(hit) : projectStats(hit)"
				:name="hit.name"
				:path="hitPath(hit, projectType)"
				:icon-url="hit.icon_url"
				:summary="hit.summary"
				:tags="[...hit.display_categories, ...hit.loaders]"
				:environment="hit.project_loader_fields?.environment?.[0]"
				:selected="index === selectedIndex"
				class="scroll-mt-16"
			/>
			<div v-if="pageCount > 1 && results.length > 0" class="flex justify-end">
				<Pagination :page="page" :count="pageCount" @switch-page="goToPage" />
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import type { Labrinth } from '@modrinth/api-client'
import { RefreshCwIcon, SearchIcon, SpinnerIcon } from '@modrinth/assets'
import { Button, commonMessages, defineMessages, Input, Pagination, useVIntl } from '@modrinth/ui'
import { computed, nextTick, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'

import CompactProjectCard from '../components/CompactProjectCard.vue'
import EmptyState from '../components/EmptyState.vue'
import { type ProjectType, SERVER_TYPE } from '../search/project-types'
import { hitPath, hitType, searchPageUrl, searchProjects } from '../search/search'
import { openModrinth } from '../utils/tabs'
import ProjectTypeSelect from './search/ProjectTypeSelect.vue'

const RESULT_LIMIT = 15
const SEARCH_DELAY_MS = 250

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'popup.search.placeholder': {
		id: 'popup.search.placeholder',
		defaultMessage: 'Search Modrinth',
	},
	'popup.search.clear': {
		id: 'popup.search.clear',
		defaultMessage: 'Clear search',
	},
	'popup.search.searching': {
		id: 'popup.search.searching',
		defaultMessage: 'Searching...',
	},
	'popup.search.failedHeading': {
		id: 'popup.search.failedHeading',
		defaultMessage: 'Search failed',
	},
	'popup.search.noResults': {
		id: 'popup.search.noResults',
		defaultMessage: 'No projects found',
	},
})

const searchInput = useTemplateRef<InstanceType<typeof Input>>('searchInput')
const resultCards = useTemplateRef<InstanceType<typeof CompactProjectCard>[]>('resultCards')
const query = ref('')
const trimmedQuery = computed(() => query.value.trim().split(/\s+/).join(' '))
const projectType = shallowRef<ProjectType | null>(null)

const root = useTemplateRef<HTMLElement>('root')
const results = shallowRef<Labrinth.Search.v3.ResultSearchProject[]>([])
const totalHits = ref(0)
const page = ref(1)
const pageCount = computed(() => Math.ceil(totalHits.value / RESULT_LIMIT))
const resultsLoading = ref(false)
const resultsFailed = ref(false)
const selectedIndex = ref(-1)

let searchTimer: ReturnType<typeof setTimeout> | undefined
let searchId = 0

// An empty search lists the most popular projects, so the tab is never blank
watch(
	[trimmedQuery, projectType],
	([value, type], previous) => {
		clearTimeout(searchTimer)
		selectedIndex.value = -1
		resultsLoading.value = true
		page.value = 1
		// Only typing waits, opening the tab or picking a type searches right away
		const delay = !previous || value === previous[0] ? 0 : SEARCH_DELAY_MS
		searchTimer = setTimeout(() => runSearch(value, type, 1), delay)
	},
	{ immediate: true },
)

async function runSearch(value: string, type: ProjectType | null, pageNumber: number) {
	const id = ++searchId
	try {
		const { hits, total } = await searchProjects(
			value,
			type,
			RESULT_LIMIT,
			(pageNumber - 1) * RESULT_LIMIT,
		)
		if (id !== searchId) return
		results.value = hits
		totalHits.value = total
		resultsFailed.value = false
	} catch (err) {
		if (id !== searchId) return
		resultsFailed.value = true
		console.error('[Modrinth Extras] Failed to search Modrinth:', err)
	} finally {
		if (id === searchId) resultsLoading.value = false
	}
}

function retrySearch() {
	resultsFailed.value = false
	resultsLoading.value = true
	void runSearch(trimmedQuery.value, projectType.value, page.value)
}

function goToPage(value: number) {
	if (value === page.value || value < 1 || value > pageCount.value) return
	clearTimeout(searchTimer)
	page.value = value
	selectedIndex.value = -1
	resultsLoading.value = true
	root.value?.scrollIntoView({ block: 'start' })
	void runSearch(trimmedQuery.value, projectType.value, value)
}

function projectStats(hit: Labrinth.Search.v3.ResultSearchProject) {
	return { author: hit.author, downloads: hit.downloads, followers: hit.follows }
}

function serverStats(hit: Labrinth.Search.v3.ResultSearchProject) {
	const server = hit.minecraft_java_server
	return {
		serverOnlinePlayers: server?.ping?.data?.players_online ?? 0,
		serverStatusOnline: !!server?.ping?.data,
		serverRecentPlays: server?.verified_plays_2w ?? 0,
	}
}

function openSearchPage() {
	void openModrinth(searchPageUrl(trimmedQuery.value, projectType.value))
}

watch(selectedIndex, async (index) => {
	await nextTick()
	resultCards.value?.[index]?.$el.scrollIntoView({ block: 'nearest' })
})

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'ArrowDown') {
		event.preventDefault()
		selectedIndex.value = Math.min(selectedIndex.value + 1, results.value.length - 1)
	} else if (event.key === 'ArrowUp') {
		event.preventDefault()
		selectedIndex.value = Math.max(selectedIndex.value - 1, -1)
	} else if (event.key === 'Enter') {
		event.preventDefault()
		const hit = results.value[selectedIndex.value]
		if (hit) void openModrinth(hitPath(hit, projectType.value))
		else openSearchPage()
	}
}

onMounted(() => searchInput.value?.focus())
</script>
