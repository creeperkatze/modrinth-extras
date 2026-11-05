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
			<div v-if="pageInfo" class="flex flex-wrap items-center gap-2">
				<ButtonLink :href="`${pageInfo.resourceUrl}reviews`" target="_blank" rel="noopener">
					{{ formatMessage(messages.writeReview) }}
					<ExternalIcon aria-hidden="true" />
				</ButtonLink>
			</div>
		</div>

		<div
			v-if="error"
			class="flex items-center gap-2 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4 text-secondary"
		>
			<TriangleAlertIcon aria-hidden="true" class="size-5 shrink-0" />
			{{ formatMessage(error === 'not-found' ? messages.notFound : messages.loadError) }}
		</div>

		<template v-else>
			<RatingSummarySkeleton v-if="loading && !pageInfo" />
			<div
				v-else-if="pageInfo && pageInfo.ratingCount > 0"
				class="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4"
			>
				<span class="text-4xl font-bold leading-none text-contrast">
					{{ pageInfo.average.toFixed(1) }}
				</span>
				<div class="flex flex-col gap-1">
					<ReviewStars :rating="pageInfo.average" size="large" />
					<span class="text-base text-secondary">
						{{ formatMessage(messages.ratingsCount, { count: pageInfo.ratingCount }) }}
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
					v-if="pageInfo"
					:page="page"
					:count="pageInfo.lastPage"
					class="ml-auto"
					@switch-page="switchPage"
				/>
				<PaginationSkeleton v-else class="ml-auto" />
			</div>

			<ReviewSkeletons
				v-if="loading"
				:count="pageInfo?.pageSize ?? DEFAULT_PAGE_SIZE"
				:label="formatMessage(messages.loading)"
			/>

			<template v-else-if="data">
				<div
					v-if="!data.reviews.length"
					class="rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4 text-secondary"
				>
					{{ formatMessage(messages.empty) }}
				</div>

				<article
					v-for="{ review, version } in reviewsWithVersions"
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
					<div
						class="markdown-body break-words text-primary"
						v-html="renderReview(review.message)"
					/>

					<PageHeaderMetadata v-if="version">
						<PageHeaderMetadataItem :icon="VersionIcon">
							<a
								v-if="version.path"
								:href="version.path"
								class="no-click-animation hover:underline"
								@click="openVersion($event, version.path)"
							>
								{{ formatMessage(messages.version, { version: version.label }) }}
							</a>
							<template v-else>
								{{ formatMessage(messages.version, { version: version.label }) }}
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
			</template>

			<Pagination
				v-if="pageInfo"
				:page="page"
				:count="pageInfo.lastPage"
				class="justify-end"
				@switch-page="switchPage"
			/>
			<PaginationSkeleton v-else class="justify-end" />
		</template>
	</div>
</template>

<script setup lang="ts">
import { ExternalIcon, TriangleAlertIcon, VersionIcon } from '@modrinth/assets'
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

import { modrinthClient } from '../../../api/client'
import type {
	SpigotReview,
	SpigotReviewSort,
	SpigotReviewsResult,
} from '../../../background/external/platforms/spigot'
import { navigate } from '../../../content/page-router'
import { i18n } from '../../../core/i18n/i18n'
import type { MatchableProject } from '../../../features/platforms/matching'
import { usePagedReviews } from '../../../features/reviews/paged-reviews'
import PaginationSkeleton from './PaginationSkeleton.vue'
import RatingSummarySkeleton from './RatingSummarySkeleton.vue'
import ReviewSkeletons from './ReviewSkeletons.vue'
import ReviewStars from './ReviewStars.vue'

const props = defineProps<{ project: MatchableProject }>()

const { formatMessage } = useVIntl()
const formatRelativeTime = useRelativeTime()

const messages = defineMessages({
	title: { id: 'spigotReviews.title', defaultMessage: 'Community reviews' },
	credit: {
		id: 'spigotReviews.credit',
		defaultMessage: 'Reviews from <link>SpigotMC</link>, written by its community.',
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

// Spiget pages are requested at this size.
const DEFAULT_PAGE_SIZE = 10

const sort = ref<ReviewSort>('newest')

const { page, data, pageInfo, loading, error, switchPage } = usePagedReviews({
	key: (pageNumber) => ['spigot-reviews', props.project.slug, sort.value, pageNumber],
	fetchPage: (pageNumber) =>
		browser.runtime.sendMessage({
			type: 'spigot-reviews',
			project: props.project,
			sort: SORTS[sort.value],
			page: pageNumber,
		}) as Promise<SpigotReviewsResult | undefined>,
})

// Synchronous, so the new sort never gets requested for the old page.
watch(sort, () => (page.value = 1), { flush: 'sync' })
const PLUGIN_LOADERS = new Set(['bukkit', 'spigot', 'paper', 'purpur', 'folia'])

interface ModrinthVersion {
	number: string
	path: string
	published: number
}

// Plugin builds come first, since a version number can have one build per loader.
const modrinthVersions = ref<ModrinthVersion[]>([])

// Spigot version names are free text, like "[6.0.4.0]" or "v2.3.1".
function normalizeVersion(name: string): string {
	return name
		.toLowerCase()
		.replace(/^[\s[(]*v?/, '')
		.replace(/[\s\])]*$/, '')
}

function resolveVersion(review: SpigotReview): { label: string; path: string | null } | null {
	// "Latest" means the version that was newest when the review was written.
	if (/^\W*latest\W*$/i.test(review.version)) {
		const reviewed = Date.parse(review.createdAt)
		const current = modrinthVersions.value
			.filter((version) => version.published <= reviewed)
			.reduce<ModrinthVersion | null>(
				(newest, version) => (newest && newest.published >= version.published ? newest : version),
				null,
			)
		return current ? { label: current.number, path: current.path } : null
	}

	// Names without a digit, like "Deleted", are not versions.
	if (!/\d/.test(review.version)) return null

	const name = normalizeVersion(review.version)
	const match = modrinthVersions.value.find((version) => normalizeVersion(version.number) === name)
	return { label: review.version, path: match?.path ?? null }
}

const reviewsWithVersions = computed(() =>
	(data.value?.reviews ?? []).map((review) => ({ review, version: resolveVersion(review) })),
)

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

// Spigot and Modrinth name versions independently, so only matching names get a link.
async function loadModrinthVersions() {
	try {
		const versions = await modrinthClient.labrinth.versions_v3.getProjectVersions(
			props.project.slug,
			{ include_changelog: false, apiVersion: 3 },
		)
		const projectPath = window.location.pathname.match(/^\/[^/]+\/[^/]+/)?.[0]
		if (!projectPath) return

		const isPlugin = (loaders: string[]) => loaders.some((loader) => PLUGIN_LOADERS.has(loader))
		modrinthVersions.value = [...versions]
			.sort((a, b) => Number(isPlugin(b.loaders)) - Number(isPlugin(a.loaders)))
			.map((version) => ({
				number: version.version_number,
				path: `${projectPath}/version/${version.id}`,
				published: Date.parse(version.date_published),
			}))
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

onMounted(() => void loadModrinthVersions())
</script>
