<template>
	<SettingCard :icon="icon" :title="title" :description="description">
		<template #control>
			<span v-tooltip="disabled ? disabledTooltip : undefined" class="inline-flex">
				<Toggle
					:model-value="modelValue"
					:disabled="disabled"
					:aria-label="title"
					@update:model-value="$emit('update:modelValue', !!$event)"
				/>
			</span>
		</template>
		<Collapsible v-if="hasOptionsSlot || actionIcon" :collapsed="!modelValue">
			<div
				class="flex flex-col gap-3 border-0 border-t border-solid border-surface-4 bg-surface-2 px-4 py-3 text-sm"
			>
				<slot />
				<Button v-if="actionIcon" size="sm" class="w-fit" @click="$emit('action')">
					<component :is="actionIcon" aria-hidden="true" />
					{{ actionLabel }}
				</Button>
			</div>
		</Collapsible>
	</SettingCard>
</template>

<script setup lang="ts">
import { Button, Collapsible, Toggle } from '@modrinth/ui'
import { Comment, type Component, computed, useSlots } from 'vue'

import SettingCard from './SettingCard.vue'

defineProps<{
	icon: Component
	title: string
	description: string
	modelValue: boolean
	actionIcon?: Component
	actionLabel?: string
	disabled?: boolean
	disabledTooltip?: string
}>()

defineEmits<{
	'update:modelValue': [value: boolean]
	action: []
}>()

const slots = useSlots()
const hasOptionsSlot = computed(() => {
	if (!slots.default) return false
	return slots.default().some((vnode) => vnode.type !== Comment)
})
</script>
