<template>
	<div class="flex flex-col gap-2">
		<div class="flex items-center justify-between gap-4">
			<span class="text-sm font-medium text-contrast">{{ label }}</span>
			<ColorPicker
				:model-value="modelValue || defaultColor"
				:label="label"
				size="sm"
				@update:model-value="emit('update:modelValue', $event)"
			/>
		</div>
		<SettingsInlineWarning v-if="warning">{{ warning }}</SettingsInlineWarning>
	</div>
</template>

<script setup lang="ts">
import { ColorPicker, SettingsInlineWarning } from '@modrinth/ui'

withDefaults(
	defineProps<{
		label: string
		modelValue: string
		defaultColor?: string
		warning?: string
	}>(),
	{
		defaultColor: '#1bd96a',
		warning: undefined,
	},
)

const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()
</script>
