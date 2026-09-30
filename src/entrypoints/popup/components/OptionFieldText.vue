<template>
	<div class="option-field relative flex items-center gap-2" @click.stop>
		<span class="text-sm text-secondary flex-1">{{ label }}</span>
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
