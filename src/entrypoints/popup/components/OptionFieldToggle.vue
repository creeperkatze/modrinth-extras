<template>
	<div class="flex items-center justify-between gap-4">
		<span class="font-semibold text-contrast">{{ label }}</span>
		<Toggle
			small
			:model-value="modelValue"
			:aria-label="label"
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
