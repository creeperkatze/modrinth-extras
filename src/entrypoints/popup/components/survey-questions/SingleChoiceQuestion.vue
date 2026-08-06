<template>
	<div class="mt-2 flex flex-wrap gap-2">
		<Button
			v-for="choice in question.choices"
			:key="choice"
			:type="selected === choice ? 'colored' : 'outlined'"
			:color="selected === choice ? 'brand' : undefined"
			size="sm"
			@click="select(choice)"
		>
			{{ choice }}
		</Button>
	</div>
	<StyledInput
		v-if="isOpenChoice"
		v-model="openText"
		class="mt-2 w-full"
		input-class="!text-sm !border !border-solid !border-surface-5"
		:placeholder="placeholder"
	/>
	<div class="mt-2 flex justify-end">
		<Button type="colored" color="brand" size="sm" :disabled="!canSubmit" @click="submit">
			{{ submitText }}
		</Button>
	</div>
</template>

<script setup lang="ts">
import { Button, StyledInput } from '@modrinth/ui'
import type { MultipleSurveyQuestion } from 'posthog-js/dist/module.no-external'
import { computed, ref } from 'vue'

const props = defineProps<{
	question: MultipleSurveyQuestion
	placeholder: string
	submitText: string
}>()

const emit = defineEmits<{
	submit: [value: string]
}>()

const selected = ref<string | null>(null)
const openText = ref('')

function select(choice: string) {
	selected.value = selected.value === choice ? null : choice
}

const isOpenChoice = computed(
	() =>
		!!props.question.hasOpenChoice &&
		selected.value === props.question.choices[props.question.choices.length - 1],
)

const canSubmit = computed(() => {
	if (!selected.value) return false
	if (isOpenChoice.value) return openText.value.trim().length > 0
	return true
})

function submit() {
	if (!canSubmit.value) return
	emit('submit', isOpenChoice.value ? openText.value.trim() : (selected.value as string))
}
</script>
