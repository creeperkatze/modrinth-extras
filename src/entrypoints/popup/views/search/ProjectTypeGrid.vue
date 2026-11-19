<template>
	<div class="grid grid-cols-2 gap-2" role="group" :aria-label="formatMessage(messages.label)">
		<button
			v-for="option in options"
			:key="option.id"
			type="button"
			:aria-pressed="model === option.type"
			class="m-0 flex min-w-0 appearance-none items-center gap-2 rounded-2xl border border-solid px-3 py-2.5 text-left transition-all"
			:class="
				model === option.type
					? 'cursor-default border-brand bg-brand-highlight text-brand'
					: 'cursor-pointer border-surface-4 bg-surface-3 text-primary hover:bg-surface-4 active:scale-95'
			"
			@click="model = option.type"
		>
			<component :is="option.icon" class="size-5 shrink-0" aria-hidden="true" />
			<span class="min-w-0 truncate text-sm font-medium">
				{{ formatMessage(option.label) }}
			</span>
		</button>
	</div>
</template>

<script setup lang="ts">
import { LayoutGridIcon } from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'

import { PROJECT_TYPES, type ProjectType } from '../../search/project-types'

const model = defineModel<ProjectType | null>({ required: true })

const { formatMessage } = useVIntl()

const messages = defineMessages({
	label: {
		id: 'popup.search.type.label',
		defaultMessage: 'Project type',
	},
	all: {
		id: 'popup.search.type.all',
		defaultMessage: 'All',
	},
})

const options = [
	{ id: 'all', type: null, label: messages.all, icon: LayoutGridIcon },
	...PROJECT_TYPES.map((type) => ({ id: type.id, type, label: type.label, icon: type.icon })),
]
</script>
