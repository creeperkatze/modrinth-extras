<template>
	<div class="flex items-center justify-between gap-4">
		<span class="text-sm font-medium text-contrast">{{ label }}</span>
		<Input
			v-model="model"
			type="password"
			size="small"
			autocomplete="off"
			:spellcheck="false"
			:placeholder="placeholder"
			:aria-label="label"
			class="w-40"
		/>
	</div>
</template>

<script setup lang="ts">
import { Input } from '@modrinth/ui'
import { computed } from 'vue'

const props = defineProps<{
	label: string
	modelValue: string
	placeholder?: string
}>()

const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()

const model = computed({
	get: () => props.modelValue,
	set: (value: string) => emit('update:modelValue', value.trim()),
})
</script>
