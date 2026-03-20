<template>
	<div
		:class="[
			'flex items-center gap-3 rounded-xl px-2 py-2',
			disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-surface-3',
		]"
		:title="disabled ? disabledTooltip : undefined"
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
</template>

<script setup lang="ts">
import { ButtonStyled } from '@modrinth/ui'
import type { Component } from 'vue'

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
</script>
