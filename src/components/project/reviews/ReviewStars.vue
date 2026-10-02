<template>
	<span
		class="relative inline-flex shrink-0"
		role="img"
		:aria-label="formatMessage(messages.rating, { rating: rating.toFixed(1) })"
	>
		<span class="inline-flex text-surface-5">
			<StarIcon v-for="i in 5" :key="i" aria-hidden="true" class="shrink-0" :class="sizeClass" />
		</span>
		<span
			class="absolute inset-y-0 left-0 inline-flex overflow-hidden text-orange"
			:style="{ width: `${(rating / 5) * 100}%` }"
		>
			<StarIcon
				v-for="i in 5"
				:key="i"
				aria-hidden="true"
				class="shrink-0 fill-current"
				:class="sizeClass"
			/>
		</span>
	</span>
</template>

<script setup lang="ts">
import { StarIcon } from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { computed } from 'vue'

const props = withDefaults(defineProps<{ rating: number; size?: 'small' | 'large' }>(), {
	size: 'small',
})

const { formatMessage } = useVIntl()

const messages = defineMessages({
	rating: { id: 'reviewStars.rating', defaultMessage: 'Rated {rating} out of 5' },
})

const sizeClass = computed(() => (props.size === 'large' ? 'size-5' : 'size-4'))
</script>
