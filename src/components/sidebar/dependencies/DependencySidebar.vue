<template>
	<div class="mb-3 flex flex-col gap-3 rounded-lg border border-surface-4 bg-surface-3 p-4">
		<div class="flex items-center justify-between gap-2">
			<h2 class="m-0 text-lg font-semibold text-contrast">
				{{ formatMessage(messages['dependencySidebar.title']) }}
			</h2>
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
		<div class="flex min-w-0 max-w-full flex-col gap-3">
			<div v-if="loading" class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal">
				<LoaderCircleIcon class="mt-0.5 shrink-0 animate-spin" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['dependencySidebar.loading']) }}
				</span>
			</div>
			<div
				v-else-if="error"
				class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal text-secondary"
			>
				<TriangleAlertIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['dependencySidebar.loadError']) }}
				</span>
			</div>
			<div
				v-else-if="roots.length === 0"
				class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal text-secondary"
			>
				<XIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages['dependencySidebar.none']) }}
				</span>
			</div>
			<div v-else class="rounded-2xl bg-surface-2 p-2">
				<ScrollablePanel class="[&__.scrollable-pane]:max-h-96">
					<ul class="m-0 flex list-none flex-col gap-3 p-0 pr-2">
						<DependencyNode
							v-for="dep in roots"
							:key="dep.project_id ?? dep.version_id"
							:dep="dep"
							:depth="0"
							:children-by-project-id="childrenByProjectId"
							:siblings-have-children="rootsHaveChildren"
						/>
					</ul>
				</ScrollablePanel>
			</div>
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
import { LoaderCircleIcon, TriangleAlertIcon, XIcon } from '@modrinth/assets'
import { ButtonStyled, defineMessages, ScrollablePanel, useVIntl } from '@modrinth/ui'
import { computed, onMounted, ref } from 'vue'

import { type EnrichedDep, fetchDependencyTree } from '../../../utils/dependencies'
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
const childrenByProjectId = ref<Map<string, EnrichedDep[]>>(new Map())
const loading = ref(true)
const error = ref(false)

const rootsHaveChildren = computed(() =>
	roots.value.some((dep) => (childrenByProjectId.value.get(dep.project_id) ?? []).length > 0),
)

onMounted(async () => {
	try {
		const tree = await fetchDependencyTree(props.projectSlug, props.versionNumber)
		roots.value = tree.roots
		childrenByProjectId.value = tree.childrenByProjectId
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch dependencies:', err)
		error.value = true
	} finally {
		loading.value = false
	}
})
</script>
