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
						? formatMessage(messages['dependencyNode.collapse'])
						: formatMessage(messages['dependencyNode.expand'])
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

			<Avatar
				:src="dep.project?.icon_url"
				:alt="dep.project?.name ?? ''"
				size="1em"
				no-shadow
				class="shrink-0"
			/>

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
import { ChevronRightIcon, LoaderCircleIcon } from '@modrinth/assets'
import { Avatar, defineMessages, useVIntl } from '@modrinth/ui'
import { computed, ref } from 'vue'

import {
	type EnrichedDep,
	fetchProjectDependencies,
	fetchVersionDependencies,
} from '../../../utils/dependencies'
import { navigate } from '../../../utils/page-router'

defineOptions({ name: 'DependencyNode' })

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'dependencyNode.collapse': {
		id: 'dependencyNode.collapse',
		defaultMessage: 'Collapse dependencies',
	},
	'dependencyNode.expand': {
		id: 'dependencyNode.expand',
		defaultMessage: 'Expand dependencies',
	},
	'dependencyNode.required': {
		id: 'dependencyNode.required',
		defaultMessage: 'Required',
	},
	'dependencyNode.optional': {
		id: 'dependencyNode.optional',
		defaultMessage: 'Optional',
	},
	'dependencyNode.incompatible': {
		id: 'dependencyNode.incompatible',
		defaultMessage: 'Incompatible',
	},
	'dependencyNode.embedded': {
		id: 'dependencyNode.embedded',
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
			required: formatMessage(messages['dependencyNode.required']),
			optional: formatMessage(messages['dependencyNode.optional']),
			incompatible: formatMessage(messages['dependencyNode.incompatible']),
			embedded: formatMessage(messages['dependencyNode.embedded']),
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
			const projectSlug = props.dep.project?.slug ?? props.dep.project_id
			children.value = props.dep.version_id
				? await fetchVersionDependencies(projectSlug, props.dep.version_id)
				: await fetchProjectDependencies(projectSlug)
		} finally {
			childrenLoading.value = false
			childrenLoaded.value = true
		}
		if (children.value.length === 0) return
	}
	expanded.value = !expanded.value
}
</script>
