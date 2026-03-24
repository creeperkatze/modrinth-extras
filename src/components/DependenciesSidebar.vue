<template>
	<div class="card flex-card experimental-styles-within">
		<h2>Dependencies</h2>
		<div class="details-list">
			<div v-if="loading" class="details-list__item">
				<LoaderCircleIcon class="animate-spin" />
				Loading
			</div>
			<div v-else-if="error" class="details-list__item font-normal text-secondary">
				Failed to load dependencies
			</div>
			<div v-else-if="roots.length === 0" class="details-list__item text-secondary">
				<XIcon aria-hidden="true" />
				No dependencies
			</div>
			<ScrollablePanel v-else class="[&__.scrollable-pane]:max-h-96">
				<ul class="m-0 flex list-none flex-col gap-3 p-0 pr-2">
					<DependencyNode
						v-for="dep in roots"
						:key="dep.project_id ?? dep.version_id"
						:dep="dep"
						:depth="0"
					/>
				</ul>
			</ScrollablePanel>
		</div>
	</div>
</template>

<script setup lang="ts">
import { LoaderCircleIcon, XIcon } from '@modrinth/assets'
import { ScrollablePanel } from '@modrinth/ui'
import { onMounted, ref } from 'vue'

import { type EnrichedDep, fetchProjectDependencies } from '../helpers/dependencies'
import DependencyNode from './DependencyNode.vue'

const props = defineProps<{
	projectSlug: string
}>()

const roots = ref<EnrichedDep[]>([])
const loading = ref(true)
const error = ref(false)

onMounted(async () => {
	try {
		roots.value = await fetchProjectDependencies(props.projectSlug)
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch dependencies:', err)
		error.value = true
	} finally {
		loading.value = false
	}
})
</script>
