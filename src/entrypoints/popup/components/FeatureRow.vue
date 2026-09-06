<template>
	<div
		v-tooltip="disabled ? disabledTooltip : undefined"
		:class="['rounded-xl transition-colors duration-200', disabled ? '' : 'hover:bg-surface-3']"
	>
		<div
			:class="[
				'flex items-center gap-3 px-2 py-2',
				disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
			]"
			@click="!disabled && $emit('update:modelValue', !modelValue)"
		>
			<component :is="icon" aria-hidden="true" class="!size-6 shrink-0 text-secondary" />
			<div class="min-w-0 flex-1">
				<div class="text-sm font-semibold text-contrast">{{ title }}</div>
				<div class="text-xs text-secondary">{{ description }}</div>
			</div>
			<IconButton
				v-if="actionIcon"
				size="sm"
				type="quiet"
				:disabled="!modelValue"
				:label="actionLabel"
				@click.stop="$emit('action')"
			>
				<component :is="actionIcon" />
			</IconButton>
			<Toggle
				small
				:model-value="modelValue"
				:aria-label="title"
				:disabled="disabled"
				@click.stop
				@update:model-value="$emit('update:modelValue', $event)"
			/>
		</div>
		<Collapsible :collapsed="!(modelValue && hasOptionsSlot)" overflow-visible>
			<div class="flex flex-col gap-2 p-2 pl-11">
				<slot />
			</div>
		</Collapsible>
	</div>
</template>

<script setup lang="ts">
import { Collapsible, IconButton, Toggle } from '@modrinth/ui'
import { Comment, type Component, computed, useSlots } from 'vue'

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
