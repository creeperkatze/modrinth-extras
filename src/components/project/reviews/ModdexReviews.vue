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
								href="https://moddex.gg"
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
				<ButtonLink :href="page.projectUrl" target="_blank" rel="noopener">
					{{ formatMessage(messages.writeReview) }}
					<ExternalIcon aria-hidden="true" />
				</ButtonLink>
			</div>
			<div v-else-if="state === 'not-found'" class="flex flex-wrap items-center gap-2">
				<ButtonLink href="https://moddex.gg" target="_blank" rel="noopener">
					{{ formatMessage(messages.openModdex) }}
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
			v-else-if="state === 'no-token' || state === 'invalid-token'"
			class="flex flex-col gap-3 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4"
		>
			<div class="flex items-start gap-2 text-contrast">
				<KeyIcon aria-hidden="true" class="mt-0.5 size-5 shrink-0" />
				<span class="font-semibold">
					{{
						formatMessage(state === 'no-token' ? messages.noTokenTitle : messages.invalidTokenTitle)
					}}
				</span>
			</div>
			<p class="m-0 text-secondary">{{ formatMessage(messages.tokenHelp) }}</p>
			<div>
				<ButtonLink
					type="colored"
					color="brand"
					href="https://moddex.gg/settings?tab=tokens"
					target="_blank"
					rel="noopener"
				>
					{{ formatMessage(messages.createToken) }}
					<ExternalIcon aria-hidden="true" />
				</ButtonLink>
			</div>
		</div>

		<div
			v-else-if="state === 'error' || state === 'rate-limited'"
			class="flex items-center gap-2 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4 text-secondary"
		>
			<TriangleAlertIcon aria-hidden="true" class="size-5 shrink-0" />
			{{ formatMessage(state === 'rate-limited' ? messages.rateLimited : messages.loadError) }}
		</div>

		<div
			v-else-if="state === 'not-found'"
			class="flex items-center gap-2 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4 text-secondary"
		>
			<TriangleAlertIcon aria-hidden="true" class="size-5 shrink-0" />
			{{ formatMessage(messages.notFound) }}
		</div>

		<template v-else>
			<div
				v-if="summary && summary.totalRatings > 0"
				class="flex flex-col gap-4 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4"
			>
				<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
					<span class="text-4xl font-bold leading-none text-contrast">
						{{ summary.average.toFixed(1) }}
					</span>
					<div class="flex flex-col gap-1">
						<ReviewStars :rating="summary.average" size="large" />
						<span class="text-base text-secondary">
							{{ formatMessage(messages.ratingsCount, { count: summary.totalRatings }) }}
						</span>
					</div>
				</div>
				<div
					v-if="summaryCategories.length"
					class="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-3"
				>
					<div v-for="cat in summaryCategories" :key="cat.label" class="flex flex-col gap-1">
						<div class="flex items-center justify-between text-base text-secondary">
							<span>{{ cat.label }}</span>
							<span class="font-semibold text-contrast">{{ cat.value.toFixed(1) }}</span>
						</div>
						<div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-5">
							<div
								class="h-full rounded-full"
								:class="barColor(cat.value)"
								:style="{ width: `${(cat.value / 5) * 100}%` }"
							/>
						</div>
					</div>
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
				<span class="text-base font-semibold text-secondary">
					{{ formatMessage(messages.count, { count: total }) }}
				</span>
				<Pagination
					v-if="page"
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
				:key="review.id"
				class="flex flex-col gap-3 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4"
			>
				<header class="flex items-start gap-3">
					<div
						class="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-5 text-lg font-bold text-contrast"
						aria-hidden="true"
					>
						{{ review.author.name.charAt(0).toUpperCase() }}
					</div>
					<div class="flex min-w-0 flex-1 flex-col gap-0.5">
						<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
							<span class="truncate font-semibold text-contrast">{{ review.author.name }}</span>
							<span
								v-if="review.is_verified_developer"
								class="inline-flex items-center gap-1 rounded-full bg-brand-highlight px-2 py-0.5 text-base font-semibold text-brand"
							>
								<ShieldCheckIcon aria-hidden="true" class="size-3.5" />
								{{ formatMessage(messages.developer) }}
							</span>
						</div>
						<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-base text-secondary">
							<span :title="formatDate(review.created_at)">
								{{
									formatMessage(messages.posted, { time: formatRelativeTime(review.created_at) })
								}}
							</span>
							<span v-if="review.edited_at">· {{ formatMessage(messages.edited) }}</span>
						</div>
					</div>
					<div class="flex shrink-0 items-center gap-1.5">
						<ReviewStars :rating="review.rating" />
						<span class="text-base font-semibold text-contrast">{{
							review.rating.toFixed(1)
						}}</span>
					</div>
				</header>

				<div
					v-if="categoryRatings(review).length"
					class="grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-3"
				>
					<div v-for="cat in categoryRatings(review)" :key="cat.label" class="flex flex-col gap-1">
						<div class="flex items-center justify-between text-base text-secondary">
							<span>{{ cat.label }}</span>
							<span class="font-semibold text-contrast">{{ cat.value.toFixed(1) }}</span>
						</div>
						<div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-5">
							<div
								class="h-full rounded-full"
								:class="barColor(cat.value)"
								:style="{ width: `${(cat.value / 5) * 100}%` }"
							/>
						</div>
					</div>
				</div>

				<div v-if="review.title" class="text-base font-semibold text-contrast">
					{{ review.title }}
				</div>
				<!-- eslint-disable vue/no-v-html -->
				<div
					v-if="review.content"
					class="markdown-body break-words text-primary"
					v-html="renderReview(review.content)"
				/>
				<!-- eslint-enable vue/no-v-html -->

				<PageHeaderMetadata
					v-if="review.minecraft_version || review.playtime_hours || review.helpful_votes > 0"
				>
					<PageHeaderMetadataTagsItem v-if="review.minecraft_version">
						<TagItem
							v-for="version in formatGameVersions(review.minecraft_version, gameVersionTags)"
							:key="version"
						>
							{{ version }}
						</TagItem>
					</PageHeaderMetadataTagsItem>
					<PageHeaderMetadataItem v-if="review.playtime_hours" :icon="ClockIcon">
						{{ formatMessage(messages.playtime, { hours: review.playtime_hours }) }}
					</PageHeaderMetadataItem>
					<PageHeaderMetadataItem v-if="review.helpful_votes > 0" :icon="HeartIcon">
						{{ formatMessage(messages.helpful, { count: review.helpful_votes }) }}
					</PageHeaderMetadataItem>
				</PageHeaderMetadata>

				<div
					v-if="review.public_moderator_note"
					class="rounded-xl border border-solid border-surface-5 bg-surface-4 p-3 text-base text-secondary"
				>
					<span class="font-semibold text-contrast">{{
						formatMessage(messages.moderatorNote)
					}}</span>
					{{ review.public_moderator_note }}
				</div>
			</article>

			<Pagination
				v-if="page"
				:page="page.page"
				:count="page.lastPage"
				class="justify-end"
				@switch-page="switchPage"
			/>
		</template>
	</div>
</template>

<script setup lang="ts">
import {
	ClockIcon,
	ExternalIcon,
	HeartIcon,
	KeyIcon,
	LoaderCircleIcon,
	ShieldCheckIcon,
	TriangleAlertIcon,
} from '@modrinth/assets'
import {
	ButtonLink,
	Combobox,
	defineMessages,
	IntlFormatted,
	PageHeaderMetadata,
	PageHeaderMetadataItem,
	PageHeaderMetadataTagsItem,
	Pagination,
	TagItem,
	useRelativeTime,
	useVIntl,
} from '@modrinth/ui'
import type { GameVersionTag } from '@modrinth/utils'
import { configuredXss, md } from '@modrinth/utils'
import type { Review } from 'moddex-js'
import { computed, onMounted, ref, watch } from 'vue'
import { browser } from 'wxt/browser'

import type {
	ModdexReviewsPage,
	ModdexReviewsResult,
	ModdexSummary,
} from '../../../background/external/moddex'
import { formatGameVersions, loadGameVersionTags } from '../../../utils/game-versions'
import { i18n } from '../../../utils/i18n'
import { getSettings } from '../../../utils/settings'
import ReviewStars from './ReviewStars.vue'

// Reviews are untrusted, so raw HTML and images are off before Modrinth's sanitizer runs.
const markdown = md({ html: false, breaks: true }).disable('image')
const defaultLinkOpen =
	markdown.renderer.rules.link_open ??
	((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options))
markdown.renderer.rules.link_open = (tokens, idx, options, env, self) => {
	tokens[idx]?.attrSet('target', '_blank')
	return defaultLinkOpen(tokens, idx, options, env, self)
}

function renderReview(content: string): string {
	return configuredXss.process(markdown.render(content))
}

const { formatMessage } = useVIntl()
const formatRelativeTime = useRelativeTime()

const messages = defineMessages({
	title: { id: 'moddexReviews.title', defaultMessage: 'Community reviews' },
	credit: {
		id: 'moddexReviews.credit',
		defaultMessage: 'Reviews provided by <link>ModDex</link>, written by its community.',
	},
	writeReview: { id: 'moddexReviews.writeReview', defaultMessage: 'Write a review' },
	openModdex: { id: 'moddexReviews.openModdex', defaultMessage: 'Open ModDex' },
	loading: { id: 'moddexReviews.loading', defaultMessage: 'Loading reviews…' },
	loadError: {
		id: 'moddexReviews.loadError',
		defaultMessage: 'Failed to load reviews from ModDex',
	},
	rateLimited: {
		id: 'moddexReviews.rateLimited',
		defaultMessage: 'ModDex rate limit reached, try again in a minute',
	},
	noTokenTitle: { id: 'moddexReviews.noTokenTitle', defaultMessage: 'ModDex API token required' },
	invalidTokenTitle: {
		id: 'moddexReviews.invalidTokenTitle',
		defaultMessage: 'Your ModDex API token is invalid or expired',
	},
	tokenHelp: {
		id: 'moddexReviews.tokenHelp',
		defaultMessage:
			'ModDex only serves reviews to signed-in API users. Create a free token on ModDex, then paste it into the Modrinth Extras popup under "Reviews".',
	},
	createToken: { id: 'moddexReviews.createToken', defaultMessage: 'Create a token' },
	notFound: {
		id: 'moddexReviews.notFound',
		defaultMessage: 'This project could not be found on ModDex.',
	},
	count: {
		id: 'moddexReviews.count',
		defaultMessage: '{count, plural, one {# written review} other {# written reviews}}',
	},
	empty: { id: 'moddexReviews.empty', defaultMessage: 'No written reviews yet. Be the first!' },
	sortLabel: { id: 'moddexReviews.sortLabel', defaultMessage: 'Sort reviews' },
	sortBy: { id: 'moddexReviews.sortBy', defaultMessage: 'Sort by:' },
	sortNewest: { id: 'moddexReviews.sortNewest', defaultMessage: 'Newest' },
	sortOldest: { id: 'moddexReviews.sortOldest', defaultMessage: 'Oldest' },
	sortRating: { id: 'moddexReviews.sortRating', defaultMessage: 'Highest rated' },
	sortLowestRating: { id: 'moddexReviews.sortLowestRating', defaultMessage: 'Lowest rated' },
	sortHelpful: { id: 'moddexReviews.sortHelpful', defaultMessage: 'Most helpful' },
	sortUnhelpful: { id: 'moddexReviews.sortUnhelpful', defaultMessage: 'Most unhelpful' },
	developer: { id: 'moddexReviews.developer', defaultMessage: 'Developer' },
	posted: { id: 'moddexReviews.posted', defaultMessage: 'Posted {time}' },
	edited: { id: 'moddexReviews.edited', defaultMessage: 'Edited' },
	ratingsCount: {
		id: 'moddexReviews.ratingsCount',
		defaultMessage: '{count, plural, one {# rating} other {# ratings}}',
	},
	gameplay: { id: 'moddexReviews.gameplay', defaultMessage: 'Gameplay' },
	performance: { id: 'moddexReviews.performance', defaultMessage: 'Performance' },
	aesthetics: { id: 'moddexReviews.aesthetics', defaultMessage: 'Aesthetics' },
	playtime: { id: 'moddexReviews.playtime', defaultMessage: '{hours, number} h played' },
	helpful: {
		id: 'moddexReviews.helpful',
		defaultMessage:
			'{count, plural, one {# person found this helpful} other {# people found this helpful}}',
	},
	moderatorNote: { id: 'moddexReviews.moderatorNote', defaultMessage: 'Moderator note:' },
})

const SORTS = {
	newest: { field: 'created_at', direction: 'desc' },
	oldest: { field: 'created_at', direction: 'asc' },
	highest: { field: 'rating', direction: 'desc' },
	lowest: { field: 'rating', direction: 'asc' },
	helpful: { field: 'helpful_votes', direction: 'desc' },
	unhelpful: { field: 'unhelpful_votes', direction: 'desc' },
} as const

type ReviewSort = keyof typeof SORTS

const sortOptions = computed(() => [
	{ value: 'newest', label: formatMessage(messages.sortNewest) },
	{ value: 'oldest', label: formatMessage(messages.sortOldest) },
	{ value: 'highest', label: formatMessage(messages.sortRating) },
	{ value: 'lowest', label: formatMessage(messages.sortLowestRating) },
	{ value: 'helpful', label: formatMessage(messages.sortHelpful) },
	{ value: 'unhelpful', label: formatMessage(messages.sortUnhelpful) },
])

const props = defineProps<{ projectSlug: string; isModpack: boolean }>()

type State =
	| 'loading'
	| 'ready'
	| 'no-token'
	| 'invalid-token'
	| 'not-found'
	| 'rate-limited'
	| 'error'

const gameVersionTags = ref<GameVersionTag[]>([])
const state = ref<State>('loading')
const reviews = ref<Review[]>([])
const page = ref<ModdexReviewsPage | null>(null)
const total = ref(0)
const summary = ref<ModdexSummary | null>(null)
const sort = ref<ReviewSort>('newest')
let requestId = 0

async function load(pageNumber: number) {
	const id = ++requestId
	state.value = 'loading'
	try {
		const { reviews: reviewSettings } = await getSettings()
		const result = (await browser.runtime.sendMessage({
			type: 'moddex-reviews',
			slug: props.projectSlug,
			isModpack: props.isModpack,
			token: reviewSettings.moddexApiToken.trim(),
			sort: SORTS[sort.value].field,
			direction: SORTS[sort.value].direction,
			page: pageNumber,
		})) as ModdexReviewsResult | undefined
		if (id !== requestId) return

		if (!result) {
			state.value = 'error'
		} else if (!result.ok) {
			state.value = result.error === 'failed' ? 'error' : result.error
		} else {
			reviews.value = result.data.reviews
			page.value = result.data
			if (result.data.summary) summary.value = result.data.summary
			total.value = result.data.total
			state.value = 'ready'
		}
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load ModDex reviews:', err)
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

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat(i18n.global.locale.value, { dateStyle: 'medium' }).format(
		new Date(iso),
	)
}

function barColor(value: number): string {
	if (value >= 4) return 'bg-green'
	if (value >= 3) return 'bg-orange'
	return 'bg-red'
}

function categoryRatings(ratings: {
	gameplay_rating: number | null
	performance_rating: number | null
	aesthetics_rating: number | null
}) {
	return [
		{ label: formatMessage(messages.gameplay), value: ratings.gameplay_rating },
		{ label: formatMessage(messages.performance), value: ratings.performance_rating },
		{ label: formatMessage(messages.aesthetics), value: ratings.aesthetics_rating },
	].filter((c): c is { label: string; value: number } => c.value != null && c.value > 0)
}

const summaryCategories = computed(() =>
	summary.value
		? categoryRatings({
				gameplay_rating: summary.value.gameplay,
				performance_rating: summary.value.performance,
				aesthetics_rating: summary.value.aesthetics,
			})
		: [],
)

onMounted(() => {
	void loadGameVersionTags().then((tags) => (gameVersionTags.value = tags))
	void load(1)
})
</script>
