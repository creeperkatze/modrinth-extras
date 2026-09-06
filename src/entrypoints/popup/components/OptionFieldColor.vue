<template>
	<div class="option-field relative flex items-center gap-2" @click.stop>
		<span class="text-sm text-secondary flex-1">{{ label }}</span>
		<ColorPicker
			:model-value="modelValue || defaultColor"
			:label="label"
			size="sm"
			@update:model-value="emit('update:modelValue', $event)"
		/>
	</div>
</template>

<script setup lang="ts">
import { ColorPicker } from '@modrinth/ui'

withDefaults(
	defineProps<{
		label: string
		modelValue: string
		defaultColor?: string
	}>(),
	{
		defaultColor: '#1bd96a',
	},
)

const emit = defineEmits<{
	'update:modelValue': [value: string]
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
