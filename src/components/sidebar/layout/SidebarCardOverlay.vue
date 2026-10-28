<template>
	<!-- Hidden cards are faded but their controls are not -->
	<div
		class="pointer-events-none absolute inset-0 z-10 rounded-2xl border-2 border-dashed"
		:class="hidden ? 'border-surface-5' : 'border-brand'"
		:style="
			hidden ? { background: 'color-mix(in srgb, var(--color-bg) 60%, transparent)' } : undefined
		"
	>
		<div
			class="pointer-events-auto absolute flex gap-0.5"
			:class="{
				'left-full top-0 ml-2 flex-col': placement === 'right',
				'right-full top-0 mr-2 flex-col': placement === 'left',
				// Card colored so it covers header buttons the card has itself while editing
				'right-3 top-3 rounded-full bg-surface-3': placement === 'inside',
			}"
		>
			<IconButton
				v-tooltip="formatMessage(messages['sidebarLayout.drag'])"
				:label="formatMessage(messages['sidebarLayout.drag'])"
				type="quiet"
				size="sm"
				class="cursor-grab touch-none"
				@pointerdown="startDrag"
				@keydown.up.prevent="moveBy(-1)"
				@keydown.down.prevent="moveBy(1)"
			>
				<GripVerticalIcon />
			</IconButton>
			<IconButton
				v-tooltip="visibilityLabel"
				:label="visibilityLabel"
				type="quiet"
				size="sm"
				@click="toggleHidden"
			>
				<EyeIcon v-if="hidden" />
				<EyeOffIcon v-else />
			</IconButton>
		</div>
	</div>
</template>

<script setup lang="ts">
import { EyeIcon, EyeOffIcon, GripVerticalIcon } from '@modrinth/assets'
import { defineMessages, IconButton, useVIntl } from '@modrinth/ui'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import type { SidebarCardSetting } from '../../../features/sidebar-layout/cards'
import { moveCardBy, startCardDrag } from '../../../features/sidebar-layout/drag'
import { saveSidebarOrder, setSidebarCardEnabled } from '../../../features/sidebar-layout/editing'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'sidebarLayout.drag': {
		id: 'sidebarLayout.drag',
		defaultMessage: 'Drag to reorder',
	},
	'sidebarLayout.hide': { id: 'sidebarLayout.hide', defaultMessage: 'Hide' },
	'sidebarLayout.show': { id: 'sidebarLayout.show', defaultMessage: 'Show' },
})

const props = defineProps<{
	card: HTMLElement
	setting: SidebarCardSetting
	hidden: boolean
}>()

const visibilityLabel = computed(() =>
	formatMessage(messages[props.hidden ? 'sidebarLayout.show' : 'sidebarLayout.hide']),
)

// A small button column plus its gap from the card
const OUTSIDE_WIDTH = 48

const placement = ref<'left' | 'right' | 'inside'>('inside')

// The controls go in the empty space on the outer side of the sidebar, which flips with the layout.
function updatePlacement() {
	const sidebar = props.card.parentElement
	if (!sidebar) return
	const bounds = sidebar.getBoundingClientRect()
	const content = document.querySelector('.normal-page__content, .ui-normal-page__content')
	const onRight = !content || bounds.left >= content.getBoundingClientRect().left
	const room = onRight ? document.documentElement.clientWidth - bounds.right : bounds.left
	placement.value = room < OUTSIDE_WIDTH ? 'inside' : onRight ? 'right' : 'left'
}

onMounted(() => {
	updatePlacement()
	window.addEventListener('resize', updatePlacement)
})

onBeforeUnmount(() => window.removeEventListener('resize', updatePlacement))

function save() {
	const sidebar = props.card.parentElement
	if (sidebar) saveSidebarOrder(sidebar)
}

function startDrag(event: PointerEvent) {
	startCardDrag(props.card, event, save)
}

function moveBy(offset: number) {
	if (moveCardBy(props.card, offset)) save()
}

function toggleHidden() {
	setSidebarCardEnabled(props.setting, props.hidden)
}
</script>
