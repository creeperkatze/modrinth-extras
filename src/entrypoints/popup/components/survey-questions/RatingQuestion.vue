<template>
	<div class="mt-2 flex items-center justify-between gap-1">
		<template v-for="value in values" :key="value">
			<IconButton
				v-if="isIconMode"
				:type="rating === value ? 'colored' : 'outlined'"
				:color="rating === value ? 'brand' : undefined"
				:label="String(value)"
				@click="rating = value"
			>
				<component :is="ratingIcon(value)" aria-hidden="true" />
			</IconButton>
			<Button
				v-else
				:type="rating === value ? 'colored' : 'outlined'"
				:color="rating === value ? 'brand' : undefined"
				size="sm"
				class="!min-w-0 !flex-1 justify-center"
				@click="rating = value"
			>
				{{ value }}
			</Button>
		</template>
	</div>
	<div class="mt-1 flex justify-between text-xs text-secondary">
		<span>{{ question.lowerBoundLabel }}</span>
		<span>{{ question.upperBoundLabel }}</span>
	</div>
	<div class="mt-2 flex justify-end">
		<Button type="colored" color="brand" size="sm" :disabled="rating === null" @click="submit">
			{{ submitText }}
		</Button>
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
import { Button, IconButton } from '@modrinth/ui'
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
