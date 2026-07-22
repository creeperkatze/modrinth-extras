<template>
	<div
		class="relative flex items-center gap-2 before:absolute before:-left-7 before:top-0 before:h-1/2 before:w-2 before:rounded-bl-sm before:border-b-2 before:border-l-2 before:border-surface-5 before:content-[''] after:absolute after:-bottom-2 after:-left-7 after:top-1/2 after:border-l-2 after:border-surface-5 after:content-[''] last:after:hidden"
		@click.stop
	>
		<span class="text-sm text-secondary flex-1">{{ label }}</span>
		<div class="flex items-center gap-2">
			<input
				type="color"
				:value="modelValue"
				class="size-7 shrink-0 cursor-pointer appearance-none rounded border-0 bg-transparent p-0 [&::-webkit-color-swatch]:rounded [&::-webkit-color-swatch]:border [&::-webkit-color-swatch]:border-surface-5 [&::-webkit-color-swatch-wrapper]:p-0"
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
