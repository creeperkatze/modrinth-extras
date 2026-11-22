<template>
	<div v-if="step" class="fixed inset-0 z-50">
		<!-- Blocks clicks on the popup while the tour is open -->
		<div class="absolute inset-0" />
		<div
			v-if="rect"
			class="pointer-events-none absolute rounded-xl transition-all duration-200"
			:style="{
				top: `${rect.top - SPOTLIGHT_PADDING}px`,
				left: `${rect.left - SPOTLIGHT_PADDING}px`,
				width: `${rect.width + SPOTLIGHT_PADDING * 2}px`,
				height: `${rect.height + SPOTLIGHT_PADDING * 2}px`,
				boxShadow: '0 0 0 9999px rgb(0 0 0 / 0.55)',
			}"
		/>

		<div
			v-if="rect"
			ref="bubble"
			role="dialog"
			aria-labelledby="tour-title"
			class="absolute flex flex-col gap-3 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4 shadow-xl transition-all duration-200"
			:style="{
				top: `${bubblePosition.top}px`,
				left: `${bubblePosition.left}px`,
				width: `${BUBBLE_WIDTH}px`,
			}"
		>
			<div
				aria-hidden="true"
				class="absolute size-3 rotate-45 border-0 border-solid border-surface-4 bg-surface-3"
				:class="
					bubblePosition.below ? '-top-1.5 border-l border-t' : '-bottom-1.5 border-b border-r'
				"
				:style="{ left: `${bubblePosition.arrowLeft}px` }"
			/>
			<div class="flex flex-col gap-1">
				<div class="flex items-center gap-2">
					<h2 id="tour-title" class="m-0 text-base font-semibold text-contrast">
						{{ formatMessage(step.title) }}
					</h2>
					<span
						v-if="state.updated && step.newFeature"
						class="rounded-full bg-brand-highlight px-2 py-0.5 text-xs font-bold text-brand"
					>
						{{ formatMessage(commonMessages.newBadge) }}
					</span>
				</div>
				<p class="m-0 text-sm leading-normal text-secondary">
					{{
						formatMessage(
							state.updated && step.updatedDescription ? step.updatedDescription : step.description,
						)
					}}
				</p>
			</div>
			<div class="flex items-center gap-2">
				<span class="mr-auto text-xs text-secondary">
					{{ formatMessage(messages.progress, { current: index + 1, total: steps.length }) }}
				</span>
				<Button v-if="!isLastStep" size="sm" type="quiet" @click="skip">
					{{ formatMessage(messages.skip) }}
				</Button>
				<Button size="sm" type="colored" color="brand" @click="next">
					{{ formatMessage(isLastStep ? commonMessages.doneLabel : commonMessages.nextButton) }}
				</Button>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	Button,
	commonMessages,
	defineMessages,
	type MessageDescriptor,
	useVIntl,
} from '@modrinth/ui'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

import {
	markTourStepsSeen,
	introductionTourItem,
	type IntroductionTourState,
} from '../../../features/tour/state'

export type IntroductionTourTarget = 'search' | 'notifications' | 'creator' | 'settings'

interface IntroductionTourStep {
	// Stored once seen, so never rename one
	id: string
	target: IntroductionTourTarget
	title: MessageDescriptor
	description: MessageDescriptor
	updatedDescription?: MessageDescriptor
	newFeature?: boolean
}

const props = defineProps<{
	active: boolean
	resolveTarget: (target: IntroductionTourTarget) => HTMLElement | null | undefined
}>()

const SPOTLIGHT_PADDING = 4
const BUBBLE_WIDTH = 280
const BUBBLE_GAP = 12
const EDGE_MARGIN = 12
const ARROW_SIZE = 12

const { formatMessage } = useVIntl()

const messages = defineMessages({
	progress: {
		id: 'popup.introductionTour.progress',
		defaultMessage: '{current} of {total}',
	},
	skip: {
		id: 'popup.introductionTour.skip',
		defaultMessage: 'Skip',
	},
	searchTitle: {
		id: 'popup.introductionTour.search.title',
		defaultMessage: 'Search',
	},
	searchDescription: {
		id: 'popup.introductionTour.search.description',
		defaultMessage: 'Find mods, modpacks, servers and more without opening Modrinth.',
	},
	notificationsTitle: {
		id: 'popup.introductionTour.notifications.title',
		defaultMessage: 'Notifications',
	},
	notificationsDescription: {
		id: 'popup.introductionTour.notifications.description',
		defaultMessage: 'Read your notifications and accept invites right from here.',
	},
	creatorTitle: {
		id: 'popup.introductionTour.creator.title',
		defaultMessage: 'Creator',
	},
	creatorDescription: {
		id: 'popup.introductionTour.creator.description',
		defaultMessage: 'Keep an eye on the views, downloads and revenue of your projects.',
	},
	settingsTitle: {
		id: 'popup.introductionTour.settings.title',
		defaultMessage: 'Settings',
	},
	settingsDescription: {
		id: 'popup.introductionTour.settings.description',
		defaultMessage: 'Customize everything Modrinth Extras has to offer.',
	},
	settingsUpdatedDescription: {
		id: 'popup.introductionTour.settings.updatedDescription',
		defaultMessage:
			'The settings have moved here. This is where you customize everything Modrinth Extras has to offer.',
	},
})

// Settings come first because configuring the extension matters more than the popup tabs
const STEPS: IntroductionTourStep[] = [
	{
		id: 'settings-button',
		target: 'settings',
		title: messages.settingsTitle,
		description: messages.settingsDescription,
		updatedDescription: messages.settingsUpdatedDescription,
	},
	{
		id: 'search-tab',
		target: 'search',
		title: messages.searchTitle,
		description: messages.searchDescription,
		newFeature: true,
	},
	{
		id: 'notifications-tab',
		target: 'notifications',
		title: messages.notificationsTitle,
		description: messages.notificationsDescription,
		newFeature: true,
	},
	{
		id: 'creator-tab',
		target: 'creator',
		title: messages.creatorTitle,
		description: messages.creatorDescription,
		newFeature: true,
	},
]

const state = ref<IntroductionTourState>({ updated: false, seenSteps: [] })
// Picked once so the progress count stays the same while clicking through
const steps = shallowRef<IntroductionTourStep[]>([])
const index = ref(0)

const step = computed(() => (props.active ? steps.value[index.value] : undefined))
const isLastStep = computed(() => index.value === steps.value.length - 1)

const rect = shallowRef<DOMRect | null>(null)
const bubble = ref<HTMLElement | null>(null)
const bubbleHeight = ref(0)

const bubblePosition = computed(() => {
	const target = rect.value
	if (!target) return { top: 0, left: 0, arrowLeft: 0, below: true }
	const center = target.left + target.width / 2
	const left = Math.min(
		Math.max(center - BUBBLE_WIDTH / 2, EDGE_MARGIN),
		window.innerWidth - BUBBLE_WIDTH - EDGE_MARGIN,
	)
	const spaceBelow = window.innerHeight - target.bottom - SPOTLIGHT_PADDING - BUBBLE_GAP
	const below = spaceBelow >= bubbleHeight.value + EDGE_MARGIN
	const top = below
		? target.bottom + SPOTLIGHT_PADDING + BUBBLE_GAP
		: target.top - SPOTLIGHT_PADDING - BUBBLE_GAP - bubbleHeight.value
	const arrowLeft = Math.min(
		Math.max(center - left - ARROW_SIZE / 2, ARROW_SIZE),
		BUBBLE_WIDTH - ARROW_SIZE * 2,
	)
	return { top, left, arrowLeft, below }
})

function sameRect(a: DOMRect | null, b: DOMRect | null) {
	return (
		a?.top === b?.top && a?.left === b?.left && a?.width === b?.width && a?.height === b?.height
	)
}

function measure() {
	const current = step.value
	const next = current
		? (props.resolveTarget(current.target)?.getBoundingClientRect() ?? null)
		: null
	if (!sameRect(rect.value, next)) rect.value = next
	bubbleHeight.value = bubble.value?.offsetHeight ?? 0
}

// Cards above the tabs load in after the tour opens and push the targets down
let frame = 0
function track() {
	measure()
	frame = requestAnimationFrame(track)
}

watch(
	step,
	(current) => {
		cancelAnimationFrame(frame)
		if (current) track()
		else rect.value = null
	},
	{ immediate: true },
)

onMounted(async () => {
	try {
		state.value = await introductionTourItem.getValue()
		steps.value = STEPS.filter((s) => !state.value.seenSteps.includes(s.id))
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load the tour:', err)
	}
})

onBeforeUnmount(() => cancelAnimationFrame(frame))

function save(ids: string[]) {
	markTourStepsSeen(ids).catch((err) =>
		console.error('[Modrinth Extras] Failed to save the tour progress:', err),
	)
}

// Saved per step so closing the popup halfway resumes the tour next time
function next() {
	if (!step.value) return
	save([step.value.id])
	index.value++
}

function skip() {
	save(steps.value.slice(index.value).map((s) => s.id))
	index.value = steps.value.length
}
</script>
