<template>
	<li class="list-none">
		<div
			class="flex items-center gap-2"
			:style="depth > 0 ? { paddingLeft: `${depth * 24}px` } : {}"
		>
			<button
				v-if="depth < MAX_DEPTH && !(childrenLoaded && children.length === 0)"
				class="flex size-[1em] shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-secondary hover:text-primary"
				:aria-expanded="expanded"
				:aria-label="
					expanded
						? formatMessage(messages['dependencyExplorer.dependencyNode.collapse'])
						: formatMessage(messages['dependencyExplorer.dependencyNode.expand'])
				"
				@click="toggle"
			>
				<LoaderCircleIcon v-if="childrenLoading" class="animate-spin" />
				<ChevronRightIcon
					v-else
					class="transition-transform duration-[150ms] ease"
					:class="{ 'rotate-90': expanded }"
				/>
			</button>
			<div v-else class="size-[1em] shrink-0" />

			<img
				v-if="dep.project?.icon_url"
				:src="dep.project.icon_url"
				class="size-[1em] shrink-0 rounded-[2px] object-cover"
				:alt="dep.project.name"
			/>
			<BoxIcon v-else />

			<a
				:href="projectHref"
				class="min-w-0 flex-1 truncate text-primary no-underline hover:underline"
				@click.prevent="navigateToProject"
			>
				{{ dep.project?.name ?? dep.project_id }}
			</a>

			<span
				class="shrink-0 rounded-full border border-solid px-2 py-1 text-xs font-medium leading-none"
				:class="badgeClass"
			>
				{{ typeLabel }}
			</span>
		</div>

		<ul v-if="expanded" class="m-0 mt-3 flex list-none flex-col gap-3 p-0">
			<DependencyNode
				v-for="child in children"
				:key="child.project_id ?? child.version_id"
				:dep="child"
				:depth="depth + 1"
			/>
		</ul>
	</li>
</template>

<script setup lang="ts">
import { BoxIcon, ChevronRightIcon, LoaderCircleIcon } from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { computed, ref } from 'vue'

import { type EnrichedDep, fetchProjectDependencies } from '../../../utils/dependencies'
import { navigate } from '../../../utils/page-router'

defineOptions({ name: 'DependencyNode' })

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'dependencyExplorer.dependencyNode.collapse': {
		id: 'dependencyExplorer.dependencyNode.collapse',
		defaultMessage: 'Collapse dependencies',
	},
	'dependencyExplorer.dependencyNode.expand': {
		id: 'dependencyExplorer.dependencyNode.expand',
		defaultMessage: 'Expand dependencies',
	},
	'dependencyExplorer.dependencyNode.required': {
		id: 'dependencyExplorer.dependencyNode.required',
		defaultMessage: 'Required',
	},
	'dependencyExplorer.dependencyNode.optional': {
		id: 'dependencyExplorer.dependencyNode.optional',
		defaultMessage: 'Optional',
	},
	'dependencyExplorer.dependencyNode.incompatible': {
		id: 'dependencyExplorer.dependencyNode.incompatible',
		defaultMessage: 'Incompatible',
	},
	'dependencyExplorer.dependencyNode.embedded': {
		id: 'dependencyExplorer.dependencyNode.embedded',
		defaultMessage: 'Embedded',
	},
})

const MAX_DEPTH = 2

const props = defineProps<{
	dep: EnrichedDep
	depth: number
}>()

const expanded = ref(false)
const children = ref<EnrichedDep[]>([])
const childrenLoading = ref(false)
const childrenLoaded = ref(false)

const projectHref = computed(() => {
	if (!props.dep.project) return '#'
	const projectType = props.dep.project.project_types[0]
	return projectType && props.dep.project.slug ? `/${projectType}/${props.dep.project.slug}` : '#'
})

const typeLabel = computed(
	() =>
		({
			required: formatMessage(messages['dependencyExplorer.dependencyNode.required']),
			optional: formatMessage(messages['dependencyExplorer.dependencyNode.optional']),
			incompatible: formatMessage(messages['dependencyExplorer.dependencyNode.incompatible']),
			embedded: formatMessage(messages['dependencyExplorer.dependencyNode.embedded']),
		})[props.dep.dependency_type] ?? props.dep.dependency_type,
)

const badgeClass = computed(
	() =>
		({
			required: 'bg-highlight border-highlight text-brand',
			optional: 'bg-button-bg border-button-bg text-secondary',
			embedded: 'bg-highlight-blue border-highlight-blue text-blue',
			incompatible: 'bg-highlight-red border-highlight-red text-red',
		})[props.dep.dependency_type] ?? 'bg-button-bg border-button-bg text-secondary',
)

function navigateToProject() {
	const projectType = props.dep.project?.project_types[0]
	const slug = props.dep.project?.slug
	if (projectType && slug) navigate(`/${projectType}/${slug}`)
}

async function toggle() {
	if (!expanded.value && !childrenLoaded.value) {
		childrenLoading.value = true
		try {
			children.value = await fetchProjectDependencies(
				props.dep.project?.slug ?? props.dep.project_id,
			)
		} finally {
			childrenLoading.value = false
			childrenLoaded.value = true
		}
		if (children.value.length === 0) return
	}
	expanded.value = !expanded.value
}
</script>
