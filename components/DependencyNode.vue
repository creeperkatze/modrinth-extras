<template>
	<li class="list-none">
		<div
			class="flex items-center gap-2"
			:style="depth > 0 ? { paddingLeft: `${depth * 24}px` } : {}"
		>
			<button
				v-if="depth < MAX_DEPTH"
				class="flex size-[1em] shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent p-0 text-secondary hover:text-primary"
				:aria-expanded="expanded"
				:aria-label="expanded ? 'Collapse dependencies' : 'Expand dependencies'"
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
				:alt="dep.project.title"
			/>
			<BoxIcon v-else />

			<a
				:href="projectHref"
				class="min-w-0 flex-1 truncate text-primary no-underline hover:underline"
				@click.prevent="navigateToProject"
			>
				{{ dep.project?.title ?? dep.project_id }}
			</a>

			<span
				class="shrink-0 rounded px-[5px] py-px text-[0.625rem] font-bold leading-[1.5]"
				:class="badgeClass"
			>
				{{ typeLabel }}
			</span>
		</div>

		<template v-if="expanded">
			<ul v-if="children.length === 0" class="m-0 mt-3 flex list-none flex-col gap-3 p-0">
				<li class="list-none text-secondary" :style="{ paddingLeft: `${(depth + 1) * 24}px` }">
					No dependencies
				</li>
			</ul>
			<ul v-else class="m-0 mt-3 flex list-none flex-col gap-3 p-0">
				<DependencyNode
					v-for="child in children"
					:key="child.project_id ?? child.version_id"
					:dep="child"
					:depth="depth + 1"
				/>
			</ul>
		</template>
	</li>
</template>

<script setup lang="ts">
import { BoxIcon, ChevronRightIcon, LoaderCircleIcon } from '@modrinth/assets'
import { computed, ref } from 'vue'
import { fetchProjectDependencies, type EnrichedDep } from '../helpers/dependencies'
import { navigate } from '../helpers/page-router'

defineOptions({ name: 'DependencyNode' })

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
	return `/${props.dep.project.project_type}/${props.dep.project.slug}`
})

const typeLabel = computed(
	() =>
		({
			required: 'Required',
			optional: 'Optional',
			incompatible: 'Incompatible',
			embedded: 'Embedded',
		})[props.dep.dependency_type] ?? props.dep.dependency_type,
)

const badgeClass = computed(
	() =>
		({
			required: 'bg-highlight text-brand',
			optional: 'bg-button-bg text-secondary',
			embedded: 'bg-highlight-blue text-blue',
			incompatible: 'bg-highlight-red text-red',
		})[props.dep.dependency_type] ?? 'bg-button-bg text-secondary',
)

function navigateToProject() {
	if (props.dep.project) {
		navigate(`/${props.dep.project.project_type}/${props.dep.project.slug}`)
	}
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
	}
	expanded.value = !expanded.value
}
</script>
