<template>
	<NewModal
		ref="modal"
		:header="formatMessage(messages['dependencyExplorer.title'])"
		:closable="true"
		:no-padding="true"
		max-width="min(96vw, 1400px)"
		width="min(92vw, 1300px)"
	>
		<div
			class="relative overflow-hidden bg-surface-2"
			style="height: 640px"
			@mousemove="onMouseMove"
			@mouseup="onMouseUp"
			@mouseleave="onMouseUp"
		>
			<svg
				ref="svgRef"
				class="block h-full w-full"
				:class="panning ? 'cursor-grabbing' : 'cursor-grab'"
				@wheel.prevent="onWheel"
			>
				<defs>
					<pattern
						id="mre-explorer-grid"
						x="0"
						y="0"
						width="28"
						height="28"
						patternUnits="userSpaceOnUse"
					>
						<circle cx="14" cy="14" r="0.7" class="fill-surface-5" />
					</pattern>
					<marker
						id="mre-arrow-required"
						markerWidth="12"
						markerHeight="10"
						refX="11"
						refY="5"
						orient="auto"
						markerUnits="userSpaceOnUse"
					>
						<path d="M 0 0 L 12 5 L 0 10 Z" class="fill-green" />
					</marker>
					<marker
						id="mre-arrow-optional"
						markerWidth="12"
						markerHeight="10"
						refX="11"
						refY="5"
						orient="auto"
						markerUnits="userSpaceOnUse"
					>
						<path d="M 0 0 L 12 5 L 0 10 Z" class="fill-secondary" />
					</marker>
					<marker
						id="mre-arrow-embedded"
						markerWidth="12"
						markerHeight="10"
						refX="11"
						refY="5"
						orient="auto"
						markerUnits="userSpaceOnUse"
					>
						<path d="M 0 0 L 12 5 L 0 10 Z" class="fill-blue" />
					</marker>
					<template v-for="node in nodes" :key="`clip-${node.id}`">
						<clipPath :id="`mre-clip-${escId(node.id)}`">
							<circle :r="nodeR(node)" />
						</clipPath>
					</template>
				</defs>

				<rect
					width="100%"
					height="100%"
					fill="url(#mre-explorer-grid)"
					@mousedown="onBgMouseDown"
				/>

				<g v-if="!initialLoading" :transform="`translate(${pan.x},${pan.y}) scale(${zoom})`">
					<g class="pointer-events-none">
						<path
							v-for="edge in edges"
							:key="edgeKey(edge)"
							:ref="(el) => setEdgeEl(edgeKey(edge), el as Element | null)"
							:d="computeEdgePath(edge, edgeCurvatures.get(edgeKey(edge)) ?? 0)"
							class="fill-none opacity-60"
							:class="{
								'stroke-green': edge.type === 'required',
								'stroke-secondary': edge.type === 'optional',
								'stroke-blue': edge.type === 'embedded',
							}"
							stroke-width="1.5"
							stroke-linecap="round"
							:marker-end="`url(#mre-arrow-${edge.type})`"
						/>
					</g>

					<g
						v-for="node in nodes"
						:key="node.id"
						:ref="(el) => setNodeEl(node.id, el as Element | null)"
						:transform="`translate(${node.x},${node.y})`"
						:class="[draggingNodeId === node.id ? 'cursor-grabbing' : 'cursor-pointer', 'group']"
						@mousedown.stop="onNodeMouseDown($event, node)"
						@click.stop="onNodeClick(node)"
					>
						<circle
							v-if="node.isRoot"
							:r="nodeR(node) + 9"
							class="fill-none stroke-green [stroke-width:1.5] mre-explorer-pulse"
						/>

						<circle
							:r="nodeR(node) + 5"
							class="fill-none stroke-primary [stroke-width:1.5] opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out pointer-events-none"
						/>

						<circle
							:r="nodeR(node)"
							class="[stroke-width:1.5]"
							:class="node.isRoot ? 'fill-green stroke-green' : 'fill-surface-4 stroke-surface-5'"
						/>

						<text
							text-anchor="middle"
							dominant-baseline="central"
							:font-size="node.isRoot ? '17' : '13'"
							font-weight="bold"
							class="pointer-events-none select-none"
							:class="node.isRoot ? 'fill-white' : 'fill-secondary'"
						>
							{{ (node.project?.name ?? node.id)[0].toUpperCase() }}
						</text>

						<image
							v-if="node.project?.icon_url"
							:href="node.project.icon_url"
							:x="-nodeR(node)"
							:y="-nodeR(node)"
							:width="nodeR(node) * 2"
							:height="nodeR(node) * 2"
							:clip-path="`url(#mre-clip-${escId(node.id)})`"
							class="pointer-events-none"
						/>

						<text
							:y="nodeR(node) + 14"
							text-anchor="middle"
							:font-size="node.isRoot ? '12' : '10'"
							:font-weight="node.isRoot ? '600' : '400'"
							class="fill-primary pointer-events-none select-none"
							:class="{ 'group-hover:underline': node.project && !node.isRoot }"
						>
							{{ clamp(node.project?.name ?? node.id, 22) }}
						</text>
					</g>
				</g>

				<text
					v-if="!initialLoading && nodes.length === 0"
					x="50%"
					y="50%"
					text-anchor="middle"
					dominant-baseline="central"
					class="fill-secondary"
					font-size="14"
				>
					{{ formatMessage(messages['dependencyExplorer.noDependencies']) }}
				</text>
			</svg>

			<div
				v-if="initialLoading"
				class="absolute inset-0 flex items-center justify-center gap-2 text-sm text-secondary pointer-events-none"
			>
				<LoaderCircleIcon class="size-4 animate-spin" />
				{{ formatMessage(messages['dependencyExplorer.loading']) }}
			</div>

			<div
				class="absolute bottom-3 left-3 flex flex-col gap-2 rounded-lg border border-surface-5 bg-surface-4 p-3 text-xs"
			>
				<div v-for="item in LEGEND" :key="item.type" class="flex items-center gap-2.5">
					<svg width="40" height="14" class="shrink-0">
						<line x1="1" y1="7" x2="29" y2="7" :stroke="item.color" stroke-width="1.5" />
						<polygon points="22,3 38,7 22,11" :fill="item.color" />
					</svg>
					<span class="text-secondary">{{ item.label }}</span>
				</div>
			</div>

			<div class="absolute bottom-3 right-3 text-xs text-secondary pointer-events-none">
				{{ formatMessage(messages['dependencyExplorer.controls']) }}
			</div>
		</div>
	</NewModal>
</template>

<script setup lang="ts">
import { LoaderCircleIcon } from '@modrinth/assets'
import { defineMessages, NewModal, useVIntl } from '@modrinth/ui'
import { computed, nextTick, ref, useTemplateRef } from 'vue'

import { type GraphEdge, type GraphNode, useForceGraph } from '../../../composables/useForceGraph'
import {
	buildEnrichedDeps,
	type EnrichedDep,
	fetchDependencyGraphLayer,
	fetchDependencyGraphRoot,
	isGraphDependency,
} from '../../../utils/dependencies'
import { navigate } from '../../../utils/page-router'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'dependencyExplorer.title': {
		id: 'dependencyExplorer.title',
		defaultMessage: 'Dependency Graph',
	},
	'dependencyExplorer.noDependencies': {
		id: 'dependencyExplorer.noDependencies',
		defaultMessage: 'This project has no dependencies',
	},
	'dependencyExplorer.controls': {
		id: 'dependencyExplorer.controls',
		defaultMessage: 'scroll to zoom · drag to pan · click a project to open',
	},
	'dependencyExplorer.dependencyNode.required': {
		id: 'dependencyExplorer.dependencyNode.required',
		defaultMessage: 'Required',
	},
	'dependencyExplorer.dependencyNode.optional': {
		id: 'dependencyExplorer.dependencyNode.optional',
		defaultMessage: 'Optional',
	},
	'dependencyExplorer.dependencyNode.embedded': {
		id: 'dependencyExplorer.dependencyNode.embedded',
		defaultMessage: 'Embedded',
	},
	'dependencyExplorer.loading': {
		id: 'dependencyExplorer.loading',
		defaultMessage: 'Loading',
	},
})

const LEGEND = computed(() => [
	{
		type: 'required',
		color: 'var(--color-brand)',
		label: formatMessage(messages['dependencyExplorer.dependencyNode.required']),
	},
	{
		type: 'optional',
		color: 'var(--color-secondary)',
		label: formatMessage(messages['dependencyExplorer.dependencyNode.optional']),
	},
	{
		type: 'embedded',
		color: 'var(--color-blue)',
		label: formatMessage(messages['dependencyExplorer.dependencyNode.embedded']),
	},
])

const props = defineProps<{ projectSlug: string; versionNumber?: string }>()

const modal = useTemplateRef<InstanceType<typeof NewModal>>('modal')
const svgRef = ref<SVGSVGElement | null>(null)
const initialLoading = ref(false)

const {
	nodes,
	edges,
	pan,
	zoom,
	panning,
	draggingNodeId,
	nodeById,
	edgeCurvatures,
	nodeR,
	edgeKey,
	computeEdgePath,
	setNodeEl,
	setEdgeEl,
	recomputeCurvatures,
	startSimulation,
	setFitOnSettle,
	reset,
	addNode,
	addEdge,
	onNodeMouseDown,
	onBgMouseDown,
	onMouseMove,
	onMouseUp,
	onWheel,
	getDragMoved,
} = useForceGraph(() => svgRef.value)

function escId(id: string): string {
	return id.replace(/[^a-zA-Z0-9]/g, '_')
}

function clamp(s: string, max: number): string {
	return s.length > max ? s.slice(0, max - 1) + '…' : s
}

function addDepsToGraph(
	sourceId: string,
	sourceProjectId: string,
	deps: EnrichedDep[],
	depth: number,
): boolean {
	const source = nodeById.get(sourceId)
	const sx = source?.x ?? 0
	const sy = source?.y ?? 0

	const withIds = deps.map((dep, i) => ({
		dep,
		nodeId:
			dep.project_id === sourceProjectId
				? `__selfdep__${Date.now().toString(36)}${i.toString(36)}${Math.random().toString(36).slice(2)}`
				: dep.project_id,
	}))

	const existingIds = new Set(nodes.value.map((n) => n.id))
	const toCreate = withIds.filter(({ nodeId }) => {
		if (existingIds.has(nodeId)) return false
		existingIds.add(nodeId)
		return true
	})

	toCreate.forEach(({ dep, nodeId }, i) => {
		const angle = (i / Math.max(toCreate.length, 1)) * 2 * Math.PI
		const r = 80 + 30 * Math.floor(i / 8)
		addNode({
			id: nodeId,
			x: sx + r * Math.cos(angle),
			y: sy + r * Math.sin(angle),
			vx: 0,
			vy: 0,
			fx: null,
			fy: null,
			project: dep.project,
			isRoot: false,
			depth,
		})
	})

	for (const { dep, nodeId } of withIds) {
		if (
			!edges.value.some(
				(e) => e.source === sourceId && e.target === nodeId && e.type === dep.dependency_type,
			)
		) {
			addEdge({
				source: sourceId,
				target: nodeId,
				type: dep.dependency_type as GraphEdge['type'],
			})
		}
	}

	for (const { dep: selfDep, nodeId: selfId } of withIds) {
		if (selfDep.project_id !== sourceProjectId) continue
		for (const { dep: sibling, nodeId: siblingId } of withIds) {
			if (sibling.project_id === sourceProjectId) continue
			addEdge({
				source: selfId,
				target: siblingId,
				type: sibling.dependency_type as GraphEdge['type'],
			})
		}
	}

	recomputeCurvatures()
	return toCreate.length > 0
}

async function initGraph() {
	reset()
	initialLoading.value = true
	zoom.value = 1

	try {
		const { project: rootProject, dependencies: rootDependencies } = await fetchDependencyGraphRoot(
			props.projectSlug,
			props.versionNumber,
		)
		const rootId = rootProject.id
		addNode({
			id: rootId,
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			fx: null,
			fy: null,
			project: rootProject,
			isRoot: true,
			depth: 0,
		})

		const expandedProjectIds = new Set([rootId])
		let frontier = [{ sourceId: rootId, sourceProjectId: rootId, dependencies: rootDependencies }]

		while (frontier.length > 0) {
			const dependencyTargets = frontier.flatMap(({ dependencies }) =>
				dependencies.filter(isGraphDependency),
			)
			const unexpandedDependencies = dependencyTargets.filter(
				(dependency) => !expandedProjectIds.has(dependency.project_id),
			)
			const { projects, dependenciesByProjectId } =
				await fetchDependencyGraphLayer(unexpandedDependencies)
			const projectsById = new Map(projects.map((project) => [project.id, project]))
			projectsById.set(rootId, rootProject)

			for (const { sourceId, sourceProjectId, dependencies } of frontier) {
				const source = nodeById.get(sourceId)
				addDepsToGraph(
					sourceId,
					sourceProjectId,
					buildEnrichedDeps(dependencies, [...projectsById.values()]),
					(source?.depth ?? 0) + 1,
				)
			}

			for (const dependency of unexpandedDependencies) {
				expandedProjectIds.add(dependency.project_id)
			}
			frontier = projects.map((project) => ({
				sourceId: project.id,
				sourceProjectId: project.id,
				dependencies: dependenciesByProjectId.get(project.id) ?? [],
			}))
		}

		setFitOnSettle(true)
		startSimulation()
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load dependency graph:', err)
	} finally {
		initialLoading.value = false
	}
}

function onNodeClick(node: GraphNode) {
	if (getDragMoved()) return
	if (node.project && !node.isRoot) {
		modal.value?.hide()
		navigate(`/${node.project.project_types[0]}/${node.project.slug}`)
	}
}

async function show() {
	modal.value?.show()
	await nextTick()
	const w = svgRef.value?.clientWidth ?? 960
	const h = svgRef.value?.clientHeight ?? 580
	pan.value = { x: w / 2, y: h / 2 }
	initGraph()
}

defineExpose({ show })
</script>

<style scoped>
.mre-explorer-pulse {
	animation: mre-explorer-pulse 2.4s ease-in-out infinite;
	transform-origin: center;
	transform-box: fill-box;
}

@keyframes mre-explorer-pulse {
	0%,
	100% {
		opacity: 0.18;
		transform: scale(1);
	}
	50% {
		opacity: 0.45;
		transform: scale(1.08);
	}
}
</style>
