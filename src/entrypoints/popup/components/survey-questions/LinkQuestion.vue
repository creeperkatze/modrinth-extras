<template>
	<div class="mt-2 flex justify-end">
		<ButtonStyled color="brand" size="small">
			<button type="button" @click="submit">
				{{ submitText }}
			</button>
		</ButtonStyled>
	</div>
</template>

<script setup lang="ts">
import { ButtonStyled } from '@modrinth/ui'
import type { LinkSurveyQuestion } from 'posthog-js/dist/module.no-external'

const props = defineProps<{
	question: LinkSurveyQuestion
	submitText: string
}>()

const emit = defineEmits<{
	submit: [value: string]
}>()

function submit() {
	if (props.question.link) window.open(props.question.link, '_blank', 'noopener')
	emit('submit', props.question.link ?? props.question.question)
}
</script>
