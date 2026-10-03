<template>
	<div class="flex flex-col gap-3">
		<div
			class="flex flex-wrap items-center gap-3 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4"
		>
			<div class="flex min-w-0 flex-1 flex-col gap-1">
				<h2 class="m-0 text-lg font-semibold text-contrast">
					{{ formatMessage(messages.title) }}
				</h2>
				<span class="text-base text-secondary">
					<IntlFormatted :message-id="messages.credit">
						<template #link="{ children }">
							<a
								href="https://www.spigotmc.org/"
								target="_blank"
								rel="noopener"
								class="font-semibold text-link"
							>
								<component :is="() => children" />
							</a>
						</template>
					</IntlFormatted>
				</span>
			</div>
			<div v-if="page" class="flex flex-wrap items-center gap-2">
				<ButtonLink :href="`${page.resourceUrl}reviews`" target="_blank" rel="noopener">
					{{ formatMessage(messages.writeReview) }}
					<ExternalIcon aria-hidden="true" />
				</ButtonLink>
			</div>
		</div>

		<div
			v-if="state === 'loading' && !reviews.length"
			class="flex items-center gap-2 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4 text-secondary"
		>
			<LoaderCircleIcon aria-hidden="true" class="size-5 animate-spin" />
			{{ formatMessage(messages.loading) }}
		</div>

		<div
			v-else-if="state === 'error' || state === 'not-found'"
			class="flex items-center gap-2 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4 text-secondary"
		>
			<TriangleAlertIcon aria-hidden="true" class="size-5 shrink-0" />
			{{ formatMessage(state === 'not-found' ? messages.notFound : messages.loadError) }}
		</div>

		<template v-else-if="page">
			<div
				v-if="page.ratingCount > 0"
				class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4"
			>
				<span class="text-4xl font-bold leading-none text-contrast">
					{{ page.average.toFixed(1) }}
				</span>
				<div class="flex flex-col gap-1">
					<ReviewStars :rating="page.average" size="large" />
					<span class="text-base text-secondary">
						{{ formatMessage(messages.ratingsCount, { count: page.ratingCount }) }}
					</span>
				</div>
			</div>

			<div class="flex flex-wrap items-center gap-2">
				<Combobox
					v-model="sort"
					:options="sortOptions"
					trigger-type="base"
					class="!w-[16rem] min-w-max max-w-full"
					:aria-label="formatMessage(messages.sortLabel)"
				>
					<template #prefix>
						<span class="font-semibold text-primary">{{ formatMessage(messages.sortBy) }}</span>
					</template>
				</Combobox>
				<Pagination
					:page="page.page"
					:count="page.lastPage"
					class="ml-auto"
					@switch-page="switchPage"
				/>
			</div>

			<div
				v-if="!reviews.length"
				class="rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4 text-secondary"
			>
				{{ formatMessage(messages.empty) }}
			</div>

			<article
				v-for="review in reviews"
				:key="review.key"
				class="flex flex-col gap-3 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4"
			>
				<header class="flex items-start gap-3">
					<div
						class="relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-5 text-lg font-bold text-contrast"
						aria-hidden="true"
					>
						{{ authorName(review).charAt(0).toUpperCase() }}
						<img
							v-if="review.authorAvatarUrl"
							:src="review.authorAvatarUrl"
							alt=""
							loading="lazy"
							class="absolute inset-0 size-full object-cover"
							@error="hideImage"
						/>
					</div>
					<div class="flex min-w-0 flex-1 flex-col gap-0.5">
						<a
							:href="review.authorUrl"
							target="_blank"
							rel="noopener"
							class="no-click-animation w-fit max-w-full truncate font-semibold text-contrast hover:underline"
						>
							{{ authorName(review) }}
						</a>
						<span class="text-base text-secondary" :title="formatDate(review.createdAt)">
							{{ formatMessage(messages.posted, { time: formatRelativeTime(review.createdAt) }) }}
						</span>
					</div>
					<div class="flex shrink-0 items-center gap-1.5">
						<ReviewStars :rating="review.rating" />
						<span class="text-base font-semibold text-contrast">{{
							review.rating.toFixed(1)
						}}</span>
					</div>
				</header>

				<!-- eslint-disable vue/no-v-html -->
				<div class="markdown-body break-words text-primary" v-html="renderReview(review.message)" />

				<PageHeaderMetadata v-if="review.version">
					<PageHeaderMetadataItem :icon="VersionIcon">
						<a
							v-if="versionPaths.has(review.version)"
							:href="versionPaths.get(review.version)"
							class="no-click-animation hover:underline"
							@click="openVersion($event, versionPaths.get(review.version)!)"
						>
							{{ formatMessage(messages.version, { version: review.version }) }}
						</a>
						<template v-else>
							{{ formatMessage(messages.version, { version: review.version }) }}
						</template>
					</PageHeaderMetadataItem>
				</PageHeaderMetadata>

				<div
					v-if="review.response"
					class="flex flex-col gap-1 rounded-xl border border-solid border-surface-5 bg-surface-4 p-3 text-base"
				>
					<span class="font-semibold text-contrast">{{
						formatMessage(messages.authorResponse)
					}}</span>
					<div
						class="markdown-body break-words text-secondary"
						v-html="renderReview(review.response)"
					/>
				</div>
				<!-- eslint-enable vue/no-v-html -->
			</article>

			<Pagination
				:page="page.page"
				:count="page.lastPage"
				class="justify-end"
				@switch-page="switchPage"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import { ExternalIcon, LoaderCircleIcon, TriangleAlertIcon, VersionIcon } from '@modrinth/assets'
import {
	ButtonLink,
	Combobox,
	defineMessages,
	IntlFormatted,
	PageHeaderMetadata,
	PageHeaderMetadataItem,
	Pagination,
	useRelativeTime,
	useVIntl,
} from '@modrinth/ui'
import { configuredXss } from '@modrinth/utils'
import { computed, onMounted, ref, watch } from 'vue'
import { browser } from 'wxt/browser'

import type {
	SpigotReview,
	SpigotReviewSort,
	SpigotReviewsPage,
	SpigotReviewsResult,
} from '../../../background/external/spigot'
import { modrinthClient } from '../../../utils/api'
import { i18n } from '../../../utils/i18n'
import { navigate } from '../../../utils/page-router'
import type { MatchableProject } from '../../../utils/platforms'
import ReviewStars from './ReviewStars.vue'

const props = defineProps<{ project: MatchableProject }>()

const { formatMessage } = useVIntl()
const formatRelativeTime = useRelativeTime()

const messages = defineMessages({
	title: { id: 'spigotReviews.title', defaultMessage: 'Community reviews' },
	credit: {
		id: 'spigotReviews.credit',
		defaultMessage: 'Reviews provided by <link>SpigotMC</link>, written by its community.',
	},
	writeReview: { id: 'spigotReviews.writeReview', defaultMessage: 'Write a review' },
	loading: { id: 'spigotReviews.loading', defaultMessage: 'Loading reviews…' },
	loadError: {
		id: 'spigotReviews.loadError',
		defaultMessage: 'Failed to load reviews from SpigotMC',
	},
	notFound: {
		id: 'spigotReviews.notFound',
		defaultMessage: 'This plugin could not be found on SpigotMC.',
	},
	ratingsCount: {
		id: 'spigotReviews.ratingsCount',
		defaultMessage: '{count, plural, one {# rating} other {# ratings}}',
	},
	empty: { id: 'spigotReviews.empty', defaultMessage: 'No reviews yet.' },
	sortLabel: { id: 'spigotReviews.sortLabel', defaultMessage: 'Sort reviews' },
	sortBy: { id: 'spigotReviews.sortBy', defaultMessage: 'Sort by:' },
	sortNewest: { id: 'spigotReviews.sortNewest', defaultMessage: 'Newest' },
	sortOldest: { id: 'spigotReviews.sortOldest', defaultMessage: 'Oldest' },
	sortRating: { id: 'spigotReviews.sortRating', defaultMessage: 'Highest rated' },
	sortLowestRating: { id: 'spigotReviews.sortLowestRating', defaultMessage: 'Lowest rated' },
	unknownAuthor: { id: 'spigotReviews.unknownAuthor', defaultMessage: 'SpigotMC member' },
	posted: { id: 'spigotReviews.posted', defaultMessage: 'Posted {time}' },
	version: { id: 'spigotReviews.version', defaultMessage: 'Version {version}' },
	authorResponse: { id: 'spigotReviews.authorResponse', defaultMessage: 'Author response:' },
})

const SORTS = {
	newest: '-date',
	oldest: '+date',
	highest: '-rating.average',
	lowest: '+rating.average',
} as const satisfies Record<string, SpigotReviewSort>

type ReviewSort = keyof typeof SORTS

const sortOptions = computed(() => [
	{ value: 'newest', label: formatMessage(messages.sortNewest) },
	{ value: 'oldest', label: formatMessage(messages.sortOldest) },
	{ value: 'highest', label: formatMessage(messages.sortRating) },
	{ value: 'lowest', label: formatMessage(messages.sortLowestRating) },
])

type State = 'loading' | 'ready' | 'not-found' | 'error'

const state = ref<State>('loading')
const reviews = ref<SpigotReview[]>([])
const page = ref<SpigotReviewsPage | null>(null)
const sort = ref<ReviewSort>('newest')
const PLUGIN_LOADERS = new Set(['bukkit', 'spigot', 'paper', 'purpur', 'folia'])

const versionPaths = ref(new Map<string, string>())
let requestId = 0

// Spigot smilies use relative image paths that would break here, so images go before sanitizing.
function renderReview(html: string): string {
	return configuredXss.process(html.replace(/<img\b[^>]*>/gi, ''))
}

function authorName(review: SpigotReview): string {
	return review.authorName ?? formatMessage(messages.unknownAuthor)
}

function hideImage(event: Event) {
	;(event.target as HTMLImageElement).hidden = true
}

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat(i18n.global.locale.value, { dateStyle: 'medium' }).format(
		new Date(iso),
	)
}

async function load(pageNumber: number) {
	const id = ++requestId
	state.value = 'loading'
	try {
		const result = (await browser.runtime.sendMessage({
			type: 'spigot-reviews',
			project: props.project,
			sort: SORTS[sort.value],
			page: pageNumber,
		})) as SpigotReviewsResult | undefined
		if (id !== requestId) return

		if (!result) {
			state.value = 'error'
		} else if (!result.ok) {
			state.value = result.error === 'failed' ? 'error' : result.error
		} else {
			reviews.value = result.data.reviews
			page.value = result.data
			state.value = 'ready'
		}
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load SpigotMC reviews:', err)
		if (id === requestId) state.value = 'error'
	}
}

function switchPage(pageNumber: number) {
	if (state.value === 'loading') return
	void load(pageNumber).then(() =>
		document.getElementById('modrinth-extras-reviews-panel')?.scrollIntoView({ block: 'start' }),
	)
}

watch(sort, () => void load(1))

// Spigot and Modrinth name versions independently, so only exact matches get a link.
async function loadVersionPaths() {
	try {
		const versions = await modrinthClient.labrinth.versions_v3.getProjectVersions(
			props.project.slug,
			{ include_changelog: false, apiVersion: 3 },
		)
		const projectPath = window.location.pathname.match(/^\/[^/]+\/[^/]+/)?.[0]
		if (!projectPath) return

		// A number can have one build per loader, and the review is about the plugin build.
		const isPlugin = (loaders: string[]) => loaders.some((loader) => PLUGIN_LOADERS.has(loader))
		const sorted = [...versions].sort(
			(a, b) => Number(isPlugin(b.loaders)) - Number(isPlugin(a.loaders)),
		)
		const paths = new Map<string, string>()
		for (const version of sorted) {
			if (!paths.has(version.version_number)) {
				paths.set(version.version_number, `${projectPath}/version/${version.id}`)
			}
		}
		versionPaths.value = paths
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load Modrinth versions for SpigotMC reviews:', err)
	}
}

// Plain clicks stay in the page like Modrinth's own links, modified clicks open a new tab as usual.
function openVersion(event: MouseEvent, path: string) {
	if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return
	event.preventDefault()
	navigate(path)
}

onMounted(() => {
	void load(1)
	void loadVersionPaths()
})
</script>
