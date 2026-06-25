<template>
	<div class="card flex-card experimental-styles-within">
		<div class="flex items-center justify-between gap-2">
			<h2>{{ formatMessage(messages['dependencySidebar.title']) }}</h2>
			<ButtonStyled
				v-if="showExplorer && !loading && !error && roots.length > 0"
				circular
				type="transparent"
			>
				<button
					v-tooltip="formatMessage(messages['dependencySidebar.openExplorer'])"
					@click="explorerRef?.show()"
				>
					<Network aria-hidden="true" />
				</button>
			</ButtonStyled>
		</div>
		<div class="details-list min-w-0 max-w-full">
			<div v-if="loading" class="details-list__item !w-full min-w-0 max-w-full !items-start">
				<LoaderCircleIcon class="mt-0.5 shrink-0 animate-spin" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['dependencySidebar.loading']) }}
				</span>
			</div>
			<div
				v-else-if="error"
				class="details-list__item !w-full min-w-0 max-w-full !items-start font-normal text-secondary"
			>
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['dependencySidebar.loadError']) }}
				</span>
			</div>
			<div
				v-else-if="roots.length === 0"
				class="details-list__item !w-full min-w-0 max-w-full !items-start text-secondary"
			>
				<XIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['dependencySidebar.none']) }}
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
import { Network } from '@lucide/vue'
import { LoaderCircleIcon, XIcon } from '@modrinth/assets'
import { ButtonStyled, defineMessages, ScrollablePanel, useVIntl } from '@modrinth/ui'
import { onMounted, ref } from 'vue'

import {
	type EnrichedDep,
	fetchProjectDependencies,
	fetchVersionDependencies,
} from '../../../utils/dependencies'
import DependencyExplorer from '../../project/DependencyExplorer.vue'
import DependencyNode from './DependencyNode.vue'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'dependencySidebar.title': { id: 'dependencySidebar.title', defaultMessage: 'Dependencies' },
	'dependencySidebar.openExplorer': {
		id: 'dependencySidebar.openExplorer',
		defaultMessage: 'Open dependency explorer',
	},
	'dependencySidebar.loading': { id: 'dependencySidebar.loading', defaultMessage: 'Loading' },
	'dependencySidebar.loadError': {
		id: 'dependencySidebar.loadError',
		defaultMessage: 'Failed to load dependencies',
	},
	'dependencySidebar.none': { id: 'dependencySidebar.none', defaultMessage: 'No dependencies' },
})

const props = defineProps<{
	projectSlug: string
	versionNumber?: string
	showExplorer?: boolean
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
