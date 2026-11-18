<template>
	<div class="overflow-clip rounded-2xl border border-solid border-surface-4 bg-surface-3">
		<div class="flex items-center justify-between gap-4 p-3">
			<div class="min-w-0">
				<h3 class="m-0 flex items-center gap-2 text-sm font-semibold text-contrast">
					<component :is="icon" class="size-4 shrink-0 text-primary" aria-hidden="true" />
					{{ title }}
				</h3>
				<p class="m-0 mt-1 text-xs leading-normal text-secondary">{{ description }}</p>
			</div>
			<span v-tooltip="disabled ? disabledTooltip : undefined" class="inline-flex shrink-0">
				<Toggle
					small
					:model-value="modelValue"
					:disabled="disabled"
					:aria-label="title"
					@update:model-value="$emit('update:modelValue', !!$event)"
				/>
			</span>
		</div>
		<Collapsible v-if="hasOptionsSlot || actionIcon" :collapsed="!modelValue">
			<div
				class="flex flex-col gap-3 border-0 border-t border-solid border-surface-4 bg-surface-2 p-3 text-sm"
			>
				<slot />
				<Button v-if="actionIcon" size="sm" class="w-fit" @click="$emit('action')">
					<component :is="actionIcon" aria-hidden="true" />
					{{ actionLabel }}
				</Button>
			</div>
		</Collapsible>
	</div>
</template>

<script setup lang="ts">
import { Button, Collapsible, Toggle } from '@modrinth/ui'
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
