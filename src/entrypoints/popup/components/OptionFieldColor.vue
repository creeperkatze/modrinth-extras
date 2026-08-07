<template>
	<div class="option-field relative flex items-center gap-2" @click.stop>
		<span class="text-sm text-secondary flex-1">{{ label }}</span>
		<div class="flex items-center gap-1">
			<button
				ref="triggerRef"
				type="button"
				:aria-label="label"
				:aria-expanded="open"
				class="size-8 shrink-0 cursor-pointer rounded-xl border border-surface-5 p-0"
				:style="{ backgroundColor: swatchColor }"
				@click="toggleOpen"
			/>
			<StyledInput v-model="text" size="small" wrapper-class="w-24" :placeholder="defaultColor" />
		</div>

		<ColorPicker
			:model-value="modelValue"
			:default-color="defaultColor"
			:anchor-el="triggerRef"
			:open="open"
			@update:model-value="text = $event"
			@update:open="open = $event"
		/>
	</div>
</template>

<script setup lang="ts">
import { StyledInput } from '@modrinth/ui'
import { computed, ref, watch } from 'vue'

import ColorPicker from './ColorPicker.vue'

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
const BARE_HEX_COLOR_PATTERN = /^[0-9a-fA-F]{6}$/

const props = withDefaults(
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

const text = ref(props.modelValue)
const open = ref(false)
const triggerRef = ref<HTMLElement | null>(null)

watch(
	() => props.modelValue,
	(newValue) => {
		if (newValue !== text.value) text.value = newValue
	},
)

watch(text, (newValue) => {
	const trimmed = String(newValue ?? '').trim()
	if (HEX_COLOR_PATTERN.test(trimmed)) emit('update:modelValue', trimmed)
	else if (BARE_HEX_COLOR_PATTERN.test(trimmed)) emit('update:modelValue', `#${trimmed}`)
})

const swatchColor = computed(() => {
	const trimmed = text.value.trim()
	if (HEX_COLOR_PATTERN.test(trimmed)) return trimmed
	if (BARE_HEX_COLOR_PATTERN.test(trimmed)) return `#${trimmed}`
	return props.defaultColor
})

function toggleOpen() {
	open.value = !open.value
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
