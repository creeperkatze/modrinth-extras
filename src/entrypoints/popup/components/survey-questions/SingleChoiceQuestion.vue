<template>
	<div class="mt-2 flex flex-wrap gap-2">
		<ButtonStyled
			v-for="choice in question.choices"
			:key="choice"
			type="chip"
			size="small"
			:color="selected === choice ? 'brand' : 'standard'"
			:highlighted="selected === choice"
		>
			<button type="button" class="!border !border-solid !border-surface-5" @click="select(choice)">
				{{ choice }}
			</button>
		</ButtonStyled>
	</div>
	<StyledInput
		v-if="isOpenChoice"
		v-model="openText"
		class="mt-2 w-full"
		input-class="!text-sm !border !border-solid !border-surface-5"
		:placeholder="placeholder"
	/>
	<div class="mt-2 flex justify-end">
		<ButtonStyled color="brand" size="small">
			<button type="button" :disabled="!canSubmit" @click="submit">
				{{ submitText }}
			</button>
		</ButtonStyled>
	</div>
</template>

<script setup lang="ts">
import { ButtonStyled, StyledInput } from '@modrinth/ui'
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
