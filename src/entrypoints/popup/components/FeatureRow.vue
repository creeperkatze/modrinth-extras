<template>
	<div v-tooltip="disabled ? disabledTooltip : undefined" class="rounded-xl bg-surface-2">
		<div
			:class="[
				'peer feature-row-header flex items-center gap-3 px-2 py-2 transition-colors duration-200',
				modelValue && hasOptionsSlot ? 'expanded' : '',
				disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-surface-3',
			]"
			@click="!disabled && $emit('update:modelValue', !modelValue)"
		>
			<component :is="icon" aria-hidden="true" class="!size-6 shrink-0 text-secondary" />
			<div class="min-w-0 flex-1">
				<div class="text-sm font-semibold text-contrast">{{ title }}</div>
				<div class="text-xs text-secondary">{{ description }}</div>
			</div>
			<ButtonStyled v-if="actionIcon" size="small" type="transparent">
				<button type="button" :disabled="!modelValue" @click.stop="$emit('action')">
					<component :is="actionIcon" />
				</button>
			</ButtonStyled>
			<button
				type="button"
				role="switch"
				:aria-checked="modelValue"
				:aria-label="title"
				:disabled="disabled"
				class="relative m-0 inline-flex h-5 w-[38px] shrink-0 items-center rounded-full border-0 p-0 transition-colors duration-200"
				:class="[
					disabled ? 'cursor-not-allowed' : 'cursor-pointer',
					modelValue ? 'bg-brand' : 'bg-button-bg',
				]"
				@click.stop="!disabled && $emit('update:modelValue', !modelValue)"
			>
				<span
					class="absolute left-0.5 top-0.5 size-4 rounded-full transition-[transform,background-color] duration-200"
					:class="modelValue ? 'bg-black/85' : 'bg-gray-400'"
					:style="modelValue ? { transform: 'translateX(18px)' } : {}"
				/>
			</button>
		</div>
		<div class="rounded-b-xl peer-hover:bg-surface-3">
			<Collapsible :collapsed="!(modelValue && hasOptionsSlot)" overflow-visible>
				<div class="px-2 pb-2">
					<div
						class="flex flex-col gap-1.5 py-1 pl-3"
						style="border-left: 2px solid var(--surface-5)"
					>
						<slot />
					</div>
				</div>
			</Collapsible>
		</div>
	</div>
</template>

<script setup lang="ts">
import { ButtonStyled, Collapsible } from '@modrinth/ui'
import { Comment, type Component, computed, useSlots } from 'vue'

defineProps<{
	icon: Component
	title: string
	description: string
	modelValue: boolean
	actionIcon?: Component
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

<style scoped>
.feature-row-header {
	border-radius: 0.75rem;
	transition: border-radius 0s 0.3s;
}

.feature-row-header.expanded {
	border-radius: 0.75rem 0.75rem 0 0;
	transition: border-radius 0s 0s;
}
</style>
