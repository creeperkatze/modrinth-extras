<template>
	<div
		class="flex items-center gap-3 px-3 py-2 transition-colors"
		:class="selected ? 'bg-surface-4' : ''"
	>
		<component
			:is="href ? 'a' : 'button'"
			:href="href"
			:type="href ? undefined : 'button'"
			class="m-0 flex min-w-0 flex-1 cursor-pointer items-center gap-3 border-0 bg-transparent p-0 text-left text-inherit no-underline [&:hover_.project-row-title]:underline"
			@click.prevent="$emit('open')"
		>
			<Avatar :src="iconUrl" :alt="name" size="2.25rem" no-shadow class="shrink-0" />
			<span class="block min-w-0 flex-1">
				<span class="project-row-title block truncate text-sm font-semibold text-contrast">
					{{ name }}
				</span>
				<span class="flex min-w-0 items-center gap-1 truncate text-xs text-secondary">
					<slot name="meta" />
				</span>
			</span>
		</component>
		<div v-if="$slots.actions" class="flex shrink-0 items-center gap-1">
			<slot name="actions" />
		</div>
	</div>
</template>

<script setup lang="ts">
import { Avatar } from '@modrinth/ui'

defineProps<{
	name: string
	iconUrl?: string | null
	href?: string
	selected?: boolean
}>()

defineEmits<{
	open: []
}>()
</script>
