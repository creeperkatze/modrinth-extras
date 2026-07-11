<template>
	<div class="mt-2 flex items-center justify-between gap-1">
		<ButtonStyled
			v-for="value in values"
			:key="value"
			type="chip"
			:circular="isIconMode"
			:size="isIconMode ? 'standard' : 'small'"
			:color="rating === value ? 'brand' : 'standard'"
			:highlighted="rating === value"
		>
			<button
				type="button"
				:class="[
					'!border !border-solid !border-surface-5',
					!isIconMode ? '!min-w-0 flex-1 justify-center' : '',
				]"
				@click="rating = value"
			>
				<component :is="ratingIcon(value)" v-if="isIconMode" aria-hidden="true" />
				<template v-else>{{ value }}</template>
			</button>
		</ButtonStyled>
	</div>
	<div class="mt-1 flex justify-between text-xs text-secondary">
		<span>{{ question.lowerBoundLabel }}</span>
		<span>{{ question.upperBoundLabel }}</span>
	</div>
	<div class="mt-2 flex justify-end">
		<ButtonStyled color="brand" size="small">
			<button type="button" :disabled="rating === null" @click="submit">
				{{ submitText }}
			</button>
		</ButtonStyled>
	</div>
</template>

<script setup lang="ts">
import {
	Angry,
	Annoyed,
	Frown,
	Laugh,
	Meh,
	Smile,
	SmilePlus,
	ThumbsDown,
	ThumbsUp,
} from '@lucide/vue'
import { ButtonStyled } from '@modrinth/ui'
import type { RatingSurveyQuestion } from 'posthog-js/dist/module.no-external'
import { type Component, computed, ref } from 'vue'

const props = defineProps<{
	question: RatingSurveyQuestion
	submitText: string
}>()

const emit = defineEmits<{
	submit: [value: number]
}>()

const values = computed(() => Array.from({ length: props.question.scale }, (_, i) => i + 1))

const RATING_ICON_SCALES: Record<number, Component[]> = {
	2: [ThumbsDown, ThumbsUp],
	3: [Frown, Meh, Smile],
	5: [Angry, Frown, Meh, Smile, Laugh],
	7: [Angry, Frown, Annoyed, Meh, Smile, SmilePlus, Laugh],
}

const isIconMode = computed(
	() => props.question.display === 'emoji' && !!RATING_ICON_SCALES[props.question.scale],
)

function ratingIcon(value: number): Component | undefined {
	return RATING_ICON_SCALES[props.question.scale]?.[value - 1]
}

const rating = ref<number | null>(null)

function submit() {
	if (rating.value === null) return
	emit('submit', rating.value)
}
</script>
