<template>
	<div class="relative flex gap-3">
		<div
			v-if="!root"
			aria-hidden="true"
			class="absolute left-[calc(-1*var(--thread-x))] top-0 h-[calc(1rem+1px)] w-[var(--thread-x)] rounded-bl-xl border-0 border-b-2 border-l-2 border-solid border-surface-5"
		/>

		<div class="flex shrink-0 flex-col items-center">
			<div
				class="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-5 font-bold text-contrast"
				:class="root ? 'size-10 text-lg' : 'size-8 text-base'"
				aria-hidden="true"
			>
				{{ comment.authorName.charAt(0).toUpperCase() }}
				<img
					v-if="comment.authorAvatarUrl"
					:src="comment.authorAvatarUrl"
					alt=""
					loading="lazy"
					class="absolute inset-0 size-full object-cover"
					@error="hideImage"
				/>
			</div>
			<div
				v-if="comment.replies.length"
				aria-hidden="true"
				class="mb-6 mt-1 w-0.5 flex-1 bg-surface-5"
			/>
		</div>

		<div class="flex min-w-0 flex-1 flex-col gap-2">
			<div class="flex flex-col gap-0.5">
				<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5">
					<a
						:href="comment.authorUrl"
						target="_blank"
						rel="noopener"
						class="no-click-animation truncate font-semibold text-contrast hover:underline"
					>
						{{ comment.authorName }}
					</a>
					<span
						v-if="comment.isProjectAuthor"
						class="inline-flex items-center gap-1 rounded-full bg-brand-highlight px-2 py-0.5 text-base font-semibold text-brand"
					>
						<ShieldCheckIcon aria-hidden="true" class="size-3.5" />
						{{ formatMessage(messages.author) }}
					</span>
					<span
						v-if="comment.pinned"
						class="inline-flex items-center gap-1 rounded-full bg-surface-5 px-2 py-0.5 text-base font-semibold text-contrast"
					>
						<PinIcon aria-hidden="true" class="size-3.5" />
						{{ formatMessage(messages.pinned) }}
					</span>
				</div>
				<div class="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-base text-secondary">
					<span :title="formatDate(comment.createdAt)">
						{{ formatMessage(messages.posted, { time: formatRelativeTime(comment.createdAt) }) }}
					</span>
					<span v-if="comment.edited">· {{ formatMessage(messages.edited) }}</span>
				</div>
			</div>

			<!-- eslint-disable-next-line vue/no-v-html -->
			<div class="markdown-body break-words text-primary" v-html="renderComment(comment.html)" />

			<div
				v-if="comment.replies.length"
				class="flex flex-col gap-4 pt-2"
				:style="{ '--thread-x': root ? 'calc(2rem + 1px)' : 'calc(1.75rem + 1px)' }"
			>
				<template v-if="expanded">
					<CurseForgeCommentItem
						v-for="reply in comment.replies"
						:key="reply.key"
						:comment="reply"
					/>
				</template>
				<!-- The thread line stops where this row starts, so its height has to match mb-6 above. -->
				<div class="relative flex h-6 items-center">
					<div
						aria-hidden="true"
						class="absolute left-[calc(-1*var(--thread-x))] top-0 h-3 w-[var(--thread-x)] rounded-bl-xl border-0 border-b-2 border-l-2 border-solid border-surface-5"
					/>
					<button
						type="button"
						class="flex w-fit cursor-pointer items-center gap-1 border-0 bg-transparent p-0 text-base font-semibold text-secondary [font-family:inherit] hover:text-contrast"
						:aria-expanded="expanded"
						@click="expanded = !expanded"
					>
						{{
							formatMessage(expanded ? messages.hideReplies : messages.showReplies, {
								count: replyCount,
							})
						}}
						<component :is="expanded ? ChevronUpIcon : ChevronDownIcon" aria-hidden="true" />
					</button>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ChevronDownIcon, ChevronUpIcon, PinIcon, ShieldCheckIcon } from '@modrinth/assets'
import { defineMessages, useRelativeTime, useVIntl } from '@modrinth/ui'
import { configuredXss } from '@modrinth/utils'
import { computed, ref } from 'vue'

import type { CurseForgeComment } from '../../../background/external/platforms/curseforge'
import { i18n } from '../../../core/i18n/i18n'

const props = defineProps<{ comment: CurseForgeComment; root?: boolean }>()

const { formatMessage } = useVIntl()
const formatRelativeTime = useRelativeTime()

const messages = defineMessages({
	author: { id: 'curseforgeComments.author', defaultMessage: 'Author' },
	pinned: { id: 'curseforgeComments.pinned', defaultMessage: 'Pinned' },
	posted: { id: 'curseforgeComments.posted', defaultMessage: 'Posted {time}' },
	edited: { id: 'curseforgeComments.edited', defaultMessage: 'Edited' },
	showReplies: {
		id: 'curseforgeComments.showReplies',
		defaultMessage: '{count, plural, one {Show # reply} other {Show # replies}}',
	},
	hideReplies: {
		id: 'curseforgeComments.hideReplies',
		defaultMessage: '{count, plural, one {Hide # reply} other {Hide # replies}}',
	},
})

const expanded = ref(true)

// Like on CurseForge, the count includes replies to replies.
function countReplies(comment: CurseForgeComment): number {
	return comment.replies.reduce((sum, reply) => sum + 1 + countReplies(reply), 0)
}

const replyCount = computed(() => countReplies(props.comment))

// CurseForge wraps outgoing links in a relative redirect, so they are unwrapped to the real target.
function resolveLink(href: string): string {
	const url = new URL(href, 'https://www.curseforge.com/')
	const remote = url.pathname === '/linkout' ? url.searchParams.get('remoteUrl') : null
	if (!remote) return url.href
	try {
		return decodeURIComponent(remote)
	} catch {
		return url.href
	}
}

function renderComment(html: string): string {
	const doc = new DOMParser().parseFromString(html, 'text/html')
	for (const link of doc.querySelectorAll('a[href]')) {
		link.setAttribute('href', resolveLink(link.getAttribute('href') ?? ''))
		link.setAttribute('target', '_blank')
		link.setAttribute('rel', 'noopener nofollow')
	}
	for (const image of doc.querySelectorAll('img[src]')) {
		image.setAttribute(
			'src',
			new URL(image.getAttribute('src') ?? '', 'https://www.curseforge.com/').href,
		)
	}
	return configuredXss.process(doc.body.innerHTML)
}

function hideImage(event: Event) {
	;(event.target as HTMLImageElement).hidden = true
}

function formatDate(iso: string): string {
	return new Intl.DateTimeFormat(i18n.global.locale.value, { dateStyle: 'medium' }).format(
		new Date(iso),
	)
}
</script>
