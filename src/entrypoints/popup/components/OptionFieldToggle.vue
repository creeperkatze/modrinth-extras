<template>
	<div
		class="option-field relative flex cursor-pointer items-center gap-2"
		@click.stop="emit('update:modelValue', !modelValue)"
	>
		<span class="text-sm text-secondary flex-1">{{ label }}</span>
		<Toggle
			small
			:model-value="modelValue"
			:aria-label="label"
			@click.stop
			@update:model-value="emit('update:modelValue', !!$event)"
		/>
	</div>
</template>

<script setup lang="ts">
import { Toggle } from '@modrinth/ui'

defineProps<{
	label: string
	modelValue: boolean
}>()

const emit = defineEmits<{
	'update:modelValue': [value: boolean]
}>()
</script>

<style scoped>
.option-field::before {
	content: '';
	position: absolute;
	left: -1.75rem;
	top: 0;
	height: 50%;
	width: 0.5rem;
	border-left: 2px solid var(--surface-5);
	border-bottom: 2px solid var(--surface-5);
	border-bottom-left-radius: 2px;
}

.option-field:not(:last-child)::after {
	content: '';
	position: absolute;
	left: -1.75rem;
	top: 50%;
	bottom: -0.5rem;
	border-left: 2px solid var(--surface-5);
}
</style>
