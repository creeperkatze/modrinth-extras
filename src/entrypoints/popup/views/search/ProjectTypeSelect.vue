<template>
	<!-- Combobox is full width by default, which would squeeze the search bar -->
	<Combobox
		class="!w-auto max-w-40"
		:options="options"
		:model-value="selected.id"
		:dropdown-min-width="200"
		show-icon-in-selected
		listbox
		trigger-class="!px-3"
		@update:model-value="select"
	/>
</template>

<script setup lang="ts">
import { LayoutGridIcon } from '@modrinth/assets'
import { Combobox, type ComboboxOption, defineMessages, useVIntl } from '@modrinth/ui'
import { computed } from 'vue'

import { PROJECT_TYPES, type ProjectType } from '../../search/project-types'

const model = defineModel<ProjectType | null>({ required: true })

const { formatMessage } = useVIntl()

const messages = defineMessages({
	all: {
		id: 'popup.search.type.all',
		defaultMessage: 'All',
	},
})

const ALL_ID = 'all'

const types = [
	{ id: ALL_ID, type: null, label: messages.all, icon: LayoutGridIcon },
	...PROJECT_TYPES.map((type) => ({ id: type.id, type, label: type.label, icon: type.icon })),
]

const options = computed<ComboboxOption<string>[]>(() =>
	types.map(({ id, label, icon }) => ({ value: id, label: formatMessage(label), icon })),
)

const selected = computed(() => types.find((t) => t.type === model.value) ?? types[0]!)

function select(id: string) {
	model.value = types.find((t) => t.id === id)?.type ?? null
}
</script>
