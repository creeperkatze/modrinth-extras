<template>
	<div class="option-field relative flex items-center gap-2" @click.stop>
		<span class="text-sm text-secondary flex-1">{{ label }}</span>
		<div class="flex items-center gap-1">
			<input
				type="color"
				:value="modelValue"
				class="size-8 shrink-0 cursor-pointer appearance-none rounded-xl border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded-xl [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-surface-5 [&::-webkit-color-swatch-wrapper]:p-0"
				@input="onColorInput"
			/>
			<StyledInput v-model="text" size="small" wrapper-class="w-24" :placeholder="defaultColor" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { StyledInput } from '@modrinth/ui'
import { ref, watch } from 'vue'

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/

const props = withDefaults(
	defineProps<{
		label: string
		modelValue: string
		defaultColor?: string
	}>(),
	{
		defaultColor: '#00af5c',
	},
)

const emit = defineEmits<{
	'update:modelValue': [value: string]
}>()

const text = ref(props.modelValue)

watch(
	() => props.modelValue,
	(value) => {
		if (value !== text.value) text.value = value
	},
)

watch(text, (value) => {
	const trimmed = String(value ?? '').trim()
	if (HEX_COLOR_PATTERN.test(trimmed)) emit('update:modelValue', trimmed)
})

function onColorInput(event: Event) {
	const value = (event.target as HTMLInputElement).value
	text.value = value
	emit('update:modelValue', value)
}
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
