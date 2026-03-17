<template>
	<div
		class="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-2 hover:bg-surface-3"
		@click="$emit('update:modelValue', !modelValue)"
	>
		<component :is="icon" aria-hidden="true" class="!size-6 shrink-0 text-secondary" />
		<div class="min-w-0 flex-1">
			<div class="text-sm font-semibold text-contrast">{{ title }}</div>
			<div class="text-xs text-secondary">{{ description }}</div>
		</div>
		<button
			type="button"
			role="switch"
			:aria-checked="modelValue"
			:aria-label="title"
			class="relative m-0 inline-flex h-5 w-[38px] shrink-0 cursor-pointer items-center rounded-full border-0 p-0 transition-colors duration-200"
			:class="modelValue ? 'bg-brand' : 'bg-button-bg'"
			@click.stop="$emit('update:modelValue', !modelValue)"
		>
			<span
				class="absolute left-0.5 top-0.5 size-4 rounded-full transition-[transform,background-color] duration-200"
				:class="modelValue ? 'bg-black/85' : 'bg-gray-400'"
				:style="modelValue ? { transform: 'translateX(18px)' } : {}"
			/>
		</button>
	</div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

defineProps<{
	icon: Component
	title: string
	description: string
	modelValue: boolean
}>()

defineEmits<{
	'update:modelValue': [value: boolean]
}>()
</script>
