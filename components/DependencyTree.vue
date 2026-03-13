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
			<div v-else-if="roots.length === 0" class="details-list__item font-normal text-secondary">
				<XIcon aria-hidden="true" />
				No dependencies
			</div>
			<ul v-else class="m-0 flex list-none flex-col gap-3 p-0">
				<DependencyNode
					v-for="dep in roots"
					:key="dep.project_id ?? dep.version_id"
					:dep="dep"
					:depth="0"
				/>
			</ul>
		</div>
	</div>
</template>

<script setup lang="ts">
import { LoaderCircleIcon, XIcon } from '@modrinth/assets'
import { onMounted, ref } from 'vue'
import { fetchProjectDependencies, type EnrichedDep } from '../helpers/dependencies'
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
	} catch {
		error.value = true
	} finally {
		loading.value = false
	}
})
</script>
