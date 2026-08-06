<template>
	<div class="mt-2 flex justify-end">
		<Button type="colored" color="brand" size="sm" @click="submit">
			{{ submitText }}
		</Button>
	</div>
</template>

<script setup lang="ts">
import { Button } from '@modrinth/ui'
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
