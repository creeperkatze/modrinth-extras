<template>
	<div ref="root">
		<template v-if="hasCards || anyHidden">
			<Button v-if="!editingSidebar" type="quiet" class="mb-3 w-full" @click="startSidebarEditing">
				<EditIcon aria-hidden="true" />
				{{ formatMessage(messages['sidebarLayout.customize']) }}
			</Button>
			<div v-else class="mb-3 grid grid-cols-2 gap-2">
				<Button type="quiet" color="red" class="w-full" @click="revertSidebarEditing">
					<UndoIcon aria-hidden="true" />
					{{ formatMessage(messages['sidebarLayout.revert']) }}
				</Button>
				<Button type="quiet" color="brand" class="w-full" @click="finishSidebarEditing">
					<CheckIcon aria-hidden="true" />
					{{ formatMessage(messages['sidebarLayout.done']) }}
				</Button>
				<Button
					v-if="customOrder"
					type="quiet"
					class="col-span-2 w-full"
					@click="resetSidebarOrder"
				>
					<RotateCounterClockwiseIcon aria-hidden="true" />
					{{ formatMessage(messages['sidebarLayout.resetOrder']) }}
				</Button>
			</div>
		</template>
		<Teleport v-for="card in editableCards" :key="card.element.id" :to="card.target">
			<SidebarCardOverlay
				:card="card.element"
				:setting="card.setting"
				:hidden="!settings[card.setting].enabled"
			/>
		</Teleport>
	</div>
</template>

<script setup lang="ts">
import { CheckIcon, EditIcon, RotateCounterClockwiseIcon, UndoIcon } from '@modrinth/assets'
import { Button, defineMessages, useVIntl } from '@modrinth/ui'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'

import { useSettings } from '../../../core/settings-store'
import {
	SIDEBAR_CARD_SETTINGS,
	sidebarCards,
	type SidebarCardSetting,
	sidebarCardSetting,
} from '../../../features/sidebar-layout/cards'
import {
	editingSidebar,
	finishSidebarEditing,
	resetSidebarOrder,
	revertSidebarEditing,
	startSidebarEditing,
} from '../../../features/sidebar-layout/editing'
import { isDefaultSidebarOrder } from '../../../features/sidebar-layout/order'
import SidebarCardOverlay from './SidebarCardOverlay.vue'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'sidebarLayout.customize': {
		id: 'sidebarLayout.customize',
		defaultMessage: 'Customize sidebar',
	},
	'sidebarLayout.revert': { id: 'sidebarLayout.revert', defaultMessage: 'Revert' },
	'sidebarLayout.done': { id: 'sidebarLayout.done', defaultMessage: 'Done' },
	'sidebarLayout.resetOrder': { id: 'sidebarLayout.resetOrder', defaultMessage: 'Reset order' },
})

interface EditableCard {
	element: HTMLElement
	target: HTMLElement
	setting: SidebarCardSetting
}

const settings = useSettings()
const root = ref<HTMLElement | null>(null)
const hasCards = ref(false)
// Lets the editor open when every card is hidden, so they can be shown again
const anyHidden = computed(() =>
	SIDEBAR_CARD_SETTINGS.some((setting) => !settings[setting].enabled),
)
const customOrder = computed(() => !isDefaultSidebarOrder(settings))
const editableCards = shallowRef<EditableCard[]>([])

let sidebar: HTMLElement | null = null
let observer: MutationObserver | null = null

function editableCard(element: HTMLElement): EditableCard | null {
	const setting = sidebarCardSetting(element)
	if (!setting) return null
	const target = document.createElement('div')
	element.style.position = 'relative'
	element.appendChild(target)
	return { element, target, setting }
}

function removeOverlay(card: EditableCard) {
	card.target.remove()
	card.element.style.position = ''
}

// Cards mount, unmount and move at any time, so overlays follow the sidebar's children.
function syncCards() {
	const elements = sidebar ? sidebarCards(sidebar) : []
	hasCards.value = elements.length > 0
	const editing = editingSidebar.value ? elements : []
	const kept = editableCards.value.filter((card) => editing.includes(card.element))
	for (const card of editableCards.value) if (!kept.includes(card)) removeOverlay(card)
	const added = editing
		.filter((element) => !kept.some((card) => card.element === element))
		.flatMap((element) => editableCard(element) ?? [])
	if (added.length || kept.length !== editableCards.value.length) {
		editableCards.value = [...kept, ...added]
	}
}

function onKeydown(event: KeyboardEvent) {
	if (event.key === 'Escape' && editingSidebar.value) finishSidebarEditing()
}

watch(editingSidebar, syncCards)

onMounted(() => {
	window.addEventListener('keydown', onKeydown)

	// The root sits in this app's own container, which is a child of the sidebar
	sidebar = root.value?.parentElement?.parentElement ?? null
	if (!sidebar) return
	syncCards()
	observer = new MutationObserver(syncCards)
	observer.observe(sidebar, { childList: true })
})

onBeforeUnmount(() => {
	observer?.disconnect()
	window.removeEventListener('keydown', onKeydown)
	for (const card of editableCards.value) removeOverlay(card)
	editableCards.value = []
	if (editingSidebar.value) finishSidebarEditing()
})
</script>
