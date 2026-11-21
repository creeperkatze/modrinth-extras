<template>
	<section class="flex w-full flex-col">
		<!-- The same header as the sections in the Modrinth app -->
		<div class="flex h-10 w-full items-center border-0 border-b border-solid border-b-surface-5">
			<button
				type="button"
				class="group/open-target flex min-w-0 cursor-pointer items-center gap-2 border-0 bg-transparent p-0"
				:aria-expanded="open"
				@click="open = !open"
			>
				<DropdownIcon
					class="size-5 shrink-0 text-secondary transition-all duration-300 group-hover/open-target:text-primary"
					:class="{ 'rotate-180': open }"
					aria-hidden="true"
				/>
				<span
					class="select-none truncate text-base font-semibold text-primary group-hover/open-target:text-contrast"
				>
					{{ title }}
				</span>
				<TagItem v-if="count" class="shrink-0 border-surface-3 bg-surface-2">
					{{ count }}
				</TagItem>
			</button>
		</div>
		<Accordion :open-by-default="open" overflow-visible class="w-full">
			<div class="pt-3">
				<slot />
			</div>
		</Accordion>
	</section>
</template>

<script setup lang="ts">
import { DropdownIcon } from '@modrinth/assets'
import { Accordion, TagItem } from '@modrinth/ui'
import { ref } from 'vue'

const props = defineProps<{
	title: string
	count: number
	openByDefault: boolean
}>()

// Only read once, so picking a theme elsewhere doesn't close this section
const open = ref(props.openByDefault)
</script>
