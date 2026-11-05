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
								href="https://www.curseforge.com/"
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
				<ButtonLink :href="`${pageInfo.projectUrl}/comments`" target="_blank" rel="noopener">
					{{ formatMessage(messages.writeComment) }}
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
			<div v-if="pageInfo" class="flex flex-wrap items-center gap-2">
				<span class="text-base text-secondary">
					{{ formatMessage(messages.commentCount, { count: pageInfo.commentCount }) }}
				</span>
				<Pagination
					:page="page"
					:count="pageInfo.lastPage"
					class="ml-auto"
					@switch-page="switchPage"
				/>
			</div>
			<div v-else class="flex flex-wrap items-center gap-2" aria-hidden="true">
				<div class="h-4 w-24 animate-pulse rounded-full bg-surface-4" />
				<PaginationSkeleton class="ml-auto" />
			</div>

			<ReviewSkeletons
				v-if="loading"
				:count="pageInfo?.pageSize ?? DEFAULT_PAGE_SIZE"
				:label="formatMessage(messages.loading)"
			/>

			<template v-else-if="data">
				<div
					v-if="!data.comments.length"
					class="rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4 text-secondary"
				>
					{{ formatMessage(messages.empty) }}
				</div>

				<article
					v-for="comment in data.comments"
					:key="comment.key"
					class="rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4"
				>
					<CurseForgeCommentItem :comment="comment" root />
				</article>
			</template>

			<div v-if="pageInfo" class="flex justify-end">
				<Pagination :page="page" :count="pageInfo.lastPage" @switch-page="switchPage" />
			</div>
			<PaginationSkeleton v-else class="justify-end" />
		</template>
	</div>
</template>

<script setup lang="ts">
import { ExternalIcon, TriangleAlertIcon } from '@modrinth/assets'
import { ButtonLink, defineMessages, IntlFormatted, Pagination, useVIntl } from '@modrinth/ui'
import { browser } from 'wxt/browser'

import type { CurseForgeCommentsResult } from '../../../background/external/platforms/curseforge'
import type { MatchableProject } from '../../../features/platforms/matching'
import { usePagedReviews } from '../../../features/reviews/paged-reviews'
import CurseForgeCommentItem from './CurseForgeCommentItem.vue'
import PaginationSkeleton from './PaginationSkeleton.vue'
import ReviewSkeletons from './ReviewSkeletons.vue'

const props = defineProps<{ project: MatchableProject }>()

const { formatMessage } = useVIntl()

const messages = defineMessages({
	title: { id: 'curseforgeComments.title', defaultMessage: 'Community comments' },
	credit: {
		id: 'curseforgeComments.credit',
		defaultMessage: 'Comments from <link>CurseForge</link>, written by its community.',
	},
	writeComment: { id: 'curseforgeComments.writeComment', defaultMessage: 'Write a comment' },
	loading: { id: 'curseforgeComments.loading', defaultMessage: 'Loading comments…' },
	loadError: {
		id: 'curseforgeComments.loadError',
		defaultMessage: 'Failed to load comments from CurseForge',
	},
	notFound: {
		id: 'curseforgeComments.notFound',
		defaultMessage: 'This project could not be found on CurseForge.',
	},
	commentCount: {
		id: 'curseforgeComments.commentCount',
		defaultMessage: '{count, plural, one {# comment} other {# comments}}',
	},
	empty: { id: 'curseforgeComments.empty', defaultMessage: 'No comments yet.' },
})

// The first page has not said its size yet, so CurseForge's usual size stands in.
const DEFAULT_PAGE_SIZE = 20

// Some pages take several seconds to load, so the next one is fetched ahead of time.
const { page, data, pageInfo, loading, error, switchPage } = usePagedReviews({
	key: (pageNumber) => ['curseforge-comments', props.project.slug, pageNumber],
	fetchPage: (pageNumber) =>
		browser.runtime.sendMessage({
			type: 'curseforge-comments',
			project: props.project,
			page: pageNumber,
		}) as Promise<CurseForgeCommentsResult | undefined>,
	prefetchNext: true,
})
</script>
