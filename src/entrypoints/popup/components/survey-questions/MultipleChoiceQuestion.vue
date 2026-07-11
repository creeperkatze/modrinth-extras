<template>
	<div class="mt-2 flex flex-wrap gap-2">
		<ButtonStyled
			v-for="choice in question.choices"
			:key="choice"
			type="chip"
			size="small"
			:color="selected.includes(choice) ? 'brand' : 'standard'"
			:highlighted="selected.includes(choice)"
		>
			<button type="button" class="!border !border-solid !border-surface-5" @click="toggle(choice)">
				{{ choice }}
			</button>
		</ButtonStyled>
	</div>
	<StyledInput
		v-if="isOpenChoiceSelected"
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
	submit: [value: string[]]
}>()

const selected = ref<string[]>([])
const openText = ref('')

const openChoiceLabel = computed(() =>
	props.question.hasOpenChoice ? props.question.choices[props.question.choices.length - 1] : null,
)

const isOpenChoiceSelected = computed(
	() => !!openChoiceLabel.value && selected.value.includes(openChoiceLabel.value),
)

function toggle(choice: string) {
	const idx = selected.value.indexOf(choice)
	if (idx === -1) selected.value = [...selected.value, choice]
	else selected.value = selected.value.filter((c) => c !== choice)
}

const canSubmit = computed(() => {
	if (selected.value.length === 0) return false
	if (isOpenChoiceSelected.value && !openText.value.trim()) return false
	return true
})

function submit() {
	if (!canSubmit.value) return
	const result = selected.value.map((choice) =>
		choice === openChoiceLabel.value ? openText.value.trim() : choice,
	)
	emit('submit', result)
}
</script>
