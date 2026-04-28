<template>
	<div class="card flex-card experimental-styles-within">
		<div class="flex items-center justify-between gap-2">
			<h2>{{ formatMessage(messages['dependenciesSidebar.title']) }}</h2>
			<button
				v-if="!loading && !error && roots.length > 0"
				v-tooltip="formatMessage(messages['dependenciesSidebar.openGraph'])"
				class="btn btn-transparent p-1"
				style="height: auto; line-height: 1"
				@click="explorerRef?.show()"
			>
				<svg
					aria-hidden="true"
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect x="16" y="16" width="6" height="6" rx="1" />
					<rect x="2" y="16" width="6" height="6" rx="1" />
					<rect x="9" y="2" width="6" height="6" rx="1" />
					<path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" />
					<path d="M12 12V8" />
				</svg>
			</button>
		</div>
		<div class="details-list min-w-0 max-w-full">
			<div v-if="loading" class="details-list__item !w-full min-w-0 max-w-full !items-start">
				<LoaderCircleIcon class="mt-0.5 shrink-0 animate-spin" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['dependenciesSidebar.loading']) }}
				</span>
			</div>
			<div
				v-else-if="error"
				class="details-list__item !w-full min-w-0 max-w-full !items-start font-normal text-secondary"
			>
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['dependenciesSidebar.loadError']) }}
				</span>
			</div>
			<div
				v-else-if="roots.length === 0"
				class="details-list__item !w-full min-w-0 max-w-full !items-start text-secondary"
			>
				<XIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['dependenciesSidebar.none']) }}
				</span>
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
		<div style="position: absolute; width: 0; height: 0; overflow: visible">
			<DependencyExplorer
				ref="explorerRef"
				:project-slug="projectSlug"
				:version-number="versionNumber"
			/>
		</div>
	</div>
</template>

<script setup lang="ts">
import { LoaderCircleIcon, XIcon } from '@modrinth/assets'
import { defineMessages, ScrollablePanel, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'

import {
	type EnrichedDep,
	fetchProjectDependencies,
	fetchVersionDependencies,
} from '../helpers/dependencies'
import DependencyExplorer from './DependencyExplorer.vue'
import DependencyNode from './DependencyNode.vue'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'dependenciesSidebar.title': { id: 'dependenciesSidebar.title', defaultMessage: 'Dependencies' },
	'dependenciesSidebar.openGraph': {
		id: 'dependenciesSidebar.openGraph',
		defaultMessage: 'Open dependency graph',
	},
	'dependenciesSidebar.loading': { id: 'dependenciesSidebar.loading', defaultMessage: 'Loading' },
	'dependenciesSidebar.loadError': {
		id: 'dependenciesSidebar.loadError',
		defaultMessage: 'Failed to load dependencies',
	},
	'dependenciesSidebar.none': { id: 'dependenciesSidebar.none', defaultMessage: 'No dependencies' },
})

const props = defineProps<{
	projectSlug: string
	versionNumber?: string
}>()

const explorerRef = ref<InstanceType<typeof DependencyExplorer> | null>(null)
const roots = ref<EnrichedDep[]>([])
const loading = ref(true)
const error = ref(false)

onMounted(async () => {
	try {
		roots.value = props.versionNumber
			? await fetchVersionDependencies(props.projectSlug, props.versionNumber)
			: await fetchProjectDependencies(props.projectSlug)
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch dependencies:', err)
		error.value = true
	} finally {
		loading.value = false
	}
})
</script>
