<template>
	<!-- Modrinth's empty state with a smaller illustration, the full size one barely fits the popup -->
	<EmptyState :type="type" :heading="heading" :description="description" class="[&>svg]:h-[140px]">
		<template v-if="$slots.actions" #actions>
			<slot name="actions" />
		</template>
	</EmptyState>
</template>

<script setup lang="ts">
import { EmptyState } from '@modrinth/ui'

defineProps<{
	// Leaves out 'empty', a cropped copy of 'empty-inbox' that renders twice as large
	type:
		| 'done'
		| 'empty-inbox'
		| 'error'
		| 'no-connection'
		| 'no-credit-card'
		| 'no-documents'
		| 'no-gps'
		| 'no-images'
		| 'no-items-cart'
		| 'no-messages'
		| 'no-search-result'
		| 'no-tasks'
	heading: string
	description?: string
}>()
</script>
