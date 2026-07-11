<template>
	<div v-if="activeSurvey" class="px-3 pt-4">
		<Card class="survey-card relative !p-0">
			<div class="flex items-start gap-3 px-2 py-2 pr-10">
				<MessagesSquareIcon class="!size-6 shrink-0 text-yellow-500" aria-hidden="true" />
				<div class="min-w-0 flex-1">
					<div class="text-sm font-semibold text-contrast">
						{{ activeSurvey.questions[0].question }}
					</div>

					<OpenQuestion
						v-if="activeSurvey.questions[0].type === 'open'"
						:placeholder="placeholder"
						:submit-text="submitText"
						@submit="handleSubmit"
					/>
					<LinkQuestion
						v-else-if="activeSurvey.questions[0].type === 'link'"
						:question="activeSurvey.questions[0]"
						:submit-text="submitText"
						@submit="handleSubmit"
					/>
					<RatingQuestion
						v-else-if="activeSurvey.questions[0].type === 'rating'"
						:question="activeSurvey.questions[0]"
						:submit-text="submitText"
						@submit="handleSubmit"
					/>
					<SingleChoiceQuestion
						v-else-if="activeSurvey.questions[0].type === 'single_choice'"
						:question="activeSurvey.questions[0]"
						:placeholder="placeholder"
						:submit-text="submitText"
						@submit="handleSubmit"
					/>
					<MultipleChoiceQuestion
						v-else-if="activeSurvey.questions[0].type === 'multiple_choice'"
						:question="activeSurvey.questions[0]"
						:placeholder="placeholder"
						:submit-text="submitText"
						@submit="handleSubmit"
					/>
				</div>
			</div>
			<ButtonStyled type="transparent" circular size="small">
				<button
					type="button"
					class="absolute right-2 top-2"
					:title="formatMessage(messages['popup.surveyPrompt.dismiss'])"
					:aria-label="formatMessage(messages['popup.surveyPrompt.dismiss'])"
					@click="dismiss"
				>
					<XIcon aria-hidden="true" />
				</button>
			</ButtonStyled>
		</Card>
	</div>
</template>

<script setup lang="ts">
import { MessagesSquareIcon, XIcon } from '@modrinth/assets'
import { ButtonStyled, Card, defineMessages, useVIntl } from '@modrinth/ui'
import { storage } from '@wxt-dev/storage'
import type { Survey, SurveyResponseValue } from 'posthog-js/dist/module.no-external'
import { computed, onMounted, ref } from 'vue'

import {
	captureSurveyDismissed,
	captureSurveyResponse,
	captureSurveyShown,
	getActiveSurvey,
	initTelemetry,
} from '../../../utils/telemetry'
import LinkQuestion from './survey-questions/LinkQuestion.vue'
import MultipleChoiceQuestion from './survey-questions/MultipleChoiceQuestion.vue'
import OpenQuestion from './survey-questions/OpenQuestion.vue'
import RatingQuestion from './survey-questions/RatingQuestion.vue'
import SingleChoiceQuestion from './survey-questions/SingleChoiceQuestion.vue'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'popup.surveyPrompt.placeholder': {
		id: 'popup.surveyPrompt.placeholder',
		defaultMessage: 'Type your answer...',
	},
	'popup.surveyPrompt.submit': {
		id: 'popup.surveyPrompt.submit',
		defaultMessage: 'Send',
	},
	'popup.surveyPrompt.dismiss': {
		id: 'popup.surveyPrompt.dismiss',
		defaultMessage: 'Dismiss',
	},
})

const seenSurveyIdsItem = storage.defineItem<string[]>('local:seenSurveyIds', { fallback: [] })

const activeSurvey = ref<Survey | null>(null)

const placeholder = computed(
	() =>
		activeSurvey.value?.appearance?.placeholder ||
		formatMessage(messages['popup.surveyPrompt.placeholder']),
)

const submitText = computed(
	() =>
		activeSurvey.value?.questions[0]?.buttonText ||
		activeSurvey.value?.appearance?.submitButtonText ||
		formatMessage(messages['popup.surveyPrompt.submit']),
)

async function markSeen(): Promise<void> {
	if (!activeSurvey.value) return
	const seenIds = await seenSurveyIdsItem.getValue()
	await seenSurveyIdsItem.setValue([...seenIds, activeSurvey.value.id])
}

async function handleSubmit(value: SurveyResponseValue): Promise<void> {
	if (!activeSurvey.value) return
	captureSurveyResponse(activeSurvey.value, value)
	await markSeen()
	activeSurvey.value = null
}

async function dismiss(): Promise<void> {
	if (!activeSurvey.value) return
	captureSurveyDismissed(activeSurvey.value)
	await markSeen()
	activeSurvey.value = null
}

onMounted(async () => {
	await initTelemetry()
	const survey = await getActiveSurvey()
	if (!survey) return

	const seenIds = await seenSurveyIdsItem.getValue()
	if (seenIds.includes(survey.id)) return

	activeSurvey.value = survey
	captureSurveyShown(survey)
})
</script>

<style scoped>
.survey-card {
	border-color: rgb(234 179 8 / 30%);
	background-color: rgb(234 179 8 / 20%);
}
</style>
