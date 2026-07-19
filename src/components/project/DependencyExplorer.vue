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
			class="relative overflow-hidden"
			style="height: 640px"
			@mousemove="onMouseMove"
			@mouseup="onMouseUp"
			@mouseleave="onCanvasMouseLeave"
		>
			<svg
				ref="svgRef"
				class="block h-full w-full"
				:class="panning ? 'cursor-grabbing' : 'cursor-grab'"
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
						markerWidth="8"
						markerHeight="7"
						refX="7"
						refY="3.5"
						orient="auto"
						markerUnits="userSpaceOnUse"
					>
						<path d="M 0 0 L 8 3.5 L 0 7 Z" class="fill-green" />
					</marker>
					<marker
						id="mre-arrow-optional"
						markerWidth="8"
						markerHeight="7"
						refX="7"
						refY="3.5"
						orient="auto"
						markerUnits="userSpaceOnUse"
					>
						<path d="M 0 0 L 8 3.5 L 0 7 Z" class="fill-secondary" />
					</marker>
					<marker
						id="mre-arrow-embedded"
						markerWidth="8"
						markerHeight="7"
						refX="7"
						refY="3.5"
						orient="auto"
						markerUnits="userSpaceOnUse"
					>
						<path d="M 0 0 L 8 3.5 L 0 7 Z" class="fill-blue" />
					</marker>
					<clipPath id="mre-clip-root">
						<circle :r="ROOT_NODE_RADIUS" />
					</clipPath>
					<clipPath id="mre-clip-node">
						<circle :r="NODE_RADIUS" />
					</clipPath>
				</defs>

				<rect width="100%" height="100%" fill="url(#mre-explorer-grid)" />

				<g
					v-if="!initialLoading"
					:style="{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }"
				>
					<g class="pointer-events-none">
						<path
							v-for="edge in visibleEdges"
							:key="edgeKey(edge)"
							:ref="(el) => setEdgeEl(edgeKey(edge), el as Element | null)"
							:d="computeEdgePath(edge, edgeOffsets.get(edgeKey(edge)) ?? 0)"
							class="fill-none transition-opacity duration-150 ease-in-out"
							:class="{
								'stroke-green': edge.type === 'required',
								'stroke-secondary': edge.type === 'optional',
								'stroke-blue': edge.type === 'embedded',
							}"
							stroke-width="1"
							:stroke-dasharray="edge.type === 'optional' ? '4 3' : undefined"
							stroke-linecap="round"
							:marker-end="`url(#mre-arrow-${edge.type})`"
						/>
					</g>

					<g
						v-for="node in visibleNodes"
						:key="node.id"
						:ref="(el) => setNodeEl(node.id, el as Element | null)"
						:style="{ transform: `translate(${node.x}px, ${node.y}px)` }"
						:class="[draggingNodeId === node.id ? 'cursor-grabbing' : 'cursor-pointer', 'group']"
						@mousedown.stop="onNodeDragStart($event, node)"
						@mouseenter="onNodeMouseEnter(node)"
						@mouseleave="onNodeMouseLeave(node)"
					>
						<a
							:ref="(el) => setDimEl(node.id, el as Element | null)"
							:href="nodeHref(node)"
							@click="onNodeLinkClick($event, node)"
						>
							<circle
								:r="getNodeRadius(node) + 5"
								class="mre-hover-ring fill-none stroke-primary [stroke-width:1.5] opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out pointer-events-none"
							/>

							<circle
								:r="getNodeRadius(node)"
								class="fill-surface-4 stroke-surface-5 [stroke-width:1.5]"
							/>

							<text
								text-anchor="middle"
								dominant-baseline="central"
								:font-size="node.isRoot ? '17' : '13'"
								font-weight="bold"
								class="fill-secondary pointer-events-none select-none"
							>
								{{ (node.project?.name ?? node.id)[0].toUpperCase() }}
							</text>

							<image
								v-if="node.project?.icon_url"
								:href="node.project.icon_url"
								:x="-getNodeRadius(node)"
								:y="-getNodeRadius(node)"
								:width="getNodeRadius(node) * 2"
								:height="getNodeRadius(node) * 2"
								:clip-path="node.isRoot ? 'url(#mre-clip-root)' : 'url(#mre-clip-node)'"
								class="pointer-events-none"
							/>

							<circle
								:r="getNodeRadius(node)"
								class="mre-dim-overlay fill-surface-1 pointer-events-none opacity-0 transition-opacity duration-150 ease-in-out"
							/>

							<text
								:y="getNodeRadius(node) + 14"
								text-anchor="middle"
								:font-size="node.isRoot ? '12' : '10'"
								:font-weight="node.isRoot ? '600' : '400'"
								class="mre-dim-target fill-primary pointer-events-none select-none transition-opacity duration-150 ease-in-out"
							>
								{{ clamp(node.project?.name ?? node.id, 22) }}
							</text>
						</a>
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
				class="absolute inset-0 flex items-center justify-center pointer-events-none"
			>
				<div class="flex w-64 max-w-[70%] flex-col gap-2">
					<div class="flex items-center justify-between text-sm text-secondary">
						<span>{{ formatMessage(messages['dependencyExplorer.loading']) }}</span>
						<span>{{ Math.round(loadingProgress) }}%</span>
					</div>
					<div class="h-1.5 w-full overflow-hidden rounded-full bg-surface-5">
						<div
							class="h-full rounded-full bg-brand transition-[width] duration-300 ease-out"
							:style="{ width: `${loadingProgress}%` }"
						/>
					</div>
				</div>
			</div>

			<div v-if="!initialLoading" class="absolute right-3 top-3 w-64">
				<StyledInput
					v-model="searchQuery"
					type="text"
					:icon="searchIcon"
					:placeholder="formatMessage(messages['dependencyExplorer.search'])"
					clearable
				/>
			</div>

			<div
				v-if="!initialLoading && maxDepth > 0"
				class="absolute left-3 top-3 flex w-72 flex-col gap-2 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-3 text-sm shadow-xl"
			>
				<span class="text-secondary">
					{{ formatMessage(messages['dependencyExplorer.depth']) }}
				</span>
				<Slider
					:model-value="depthLimit"
					:min="0"
					:max="maxDepth"
					:step="1"
					@update:model-value="setDepthLimit"
				/>
			</div>

			<div
				class="absolute bottom-3 left-3 flex flex-col gap-2 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-3 text-sm shadow-xl"
			>
				<div
					v-for="item in LEGEND"
					:key="item.type"
					class="flex items-center justify-between gap-5"
				>
					<span class="flex items-center gap-2">
						<span class="size-2.5 shrink-0 rounded-full" :style="{ backgroundColor: item.color }" />
						<span class="text-secondary">{{ item.label }}</span>
					</span>
					<Toggle
						:model-value="!hiddenTypes.has(item.type)"
						small
						@update:model-value="toggleType(item.type)"
					/>
				</div>
			</div>

			<div class="absolute bottom-3 right-3 flex items-center gap-1.5">
				<ButtonStyled circular>
					<button
						v-tooltip="formatMessage(messages['dependencyExplorer.centerView'])"
						@click="zoomToFit()"
					>
						<ExpandIcon aria-hidden="true" />
					</button>
				</ButtonStyled>
				<ButtonStyled circular>
					<button
						v-tooltip="formatMessage(messages['dependencyExplorer.reset'])"
						@click="initGraph()"
					>
						<UpdatedIcon aria-hidden="true" />
					</button>
				</ButtonStyled>
			</div>
		</div>
	</NewModal>
</template>

<script setup lang="ts">
import { ExpandIcon, SearchIcon, UpdatedIcon } from '@modrinth/assets'
import {
	ButtonStyled,
	defineMessages,
	NewModal,
	Slider,
	StyledInput,
	Toggle,
	useVIntl,
} from '@modrinth/ui'
import { computed, nextTick, onUnmounted, ref, useTemplateRef, watch } from 'vue'

import {
	type GraphEdge,
	type GraphNode,
	NODE_RADIUS,
	ROOT_NODE_RADIUS,
	useForceGraph,
} from '../../composables/useForceGraph'
import {
	buildEnrichedDeps,
	type EnrichedDep,
	fetchDependencyGraphLayer,
	fetchDependencyGraphRoot,
	isGraphDependency,
} from '../../utils/dependencies'
import { navigate, resolveLink } from '../../utils/page-router'

// Cast: duplicate `vue` instances under pnpm make `@modrinth/assets`/`@modrinth/ui` `Component` types nominally unrelated.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const searchIcon = SearchIcon as any

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'dependencyExplorer.title': {
		id: 'dependencyExplorer.title',
		defaultMessage: 'Dependency Explorer',
	},
	'dependencyExplorer.noDependencies': {
		id: 'dependencyExplorer.noDependencies',
		defaultMessage: 'This project has no dependencies',
	},
	'dependencyExplorer.centerView': {
		id: 'dependencyExplorer.centerView',
		defaultMessage: 'Center view',
	},
	'dependencyExplorer.reset': {
		id: 'dependencyExplorer.reset',
		defaultMessage: 'Reset',
	},
	'dependencyExplorer.depth': {
		id: 'dependencyExplorer.depth',
		defaultMessage: 'Depth',
	},
	'dependencyNode.required': {
		id: 'dependencyNode.required',
		defaultMessage: 'Required',
	},
	'dependencyNode.optional': {
		id: 'dependencyNode.optional',
		defaultMessage: 'Optional',
	},
	'dependencyNode.embedded': {
		id: 'dependencyNode.embedded',
		defaultMessage: 'Embedded',
	},
	'dependencyExplorer.loading': {
		id: 'dependencyExplorer.loading',
		defaultMessage: 'Loading',
	},
	'dependencyExplorer.search': {
		id: 'dependencyExplorer.search',
		defaultMessage: 'Search dependencies',
	},
})

type DepType = GraphEdge['type']

const LEGEND = computed<{ type: DepType; color: string; label: string }[]>(() => [
	{
		type: 'required',
		color: 'var(--color-brand)',
		label: formatMessage(messages['dependencyNode.required']),
	},
	{
		type: 'optional',
		color: 'var(--color-secondary)',
		label: formatMessage(messages['dependencyNode.optional']),
	},
	{
		type: 'embedded',
		color: 'var(--color-blue)',
		label: formatMessage(messages['dependencyNode.embedded']),
	},
])

const hiddenTypes = ref(new Set<DepType>())

const props = defineProps<{ projectSlug: string; versionNumber?: string }>()

const modal = useTemplateRef<InstanceType<typeof NewModal>>('modal')
const svgRef = ref<SVGSVGElement | null>(null)
const initialLoading = ref(false)
const loadingProgress = ref(0)

const {
	nodes,
	edges,
	pan,
	zoom,
	panning,
	draggingNodeId,
	nodeById,
	edgeElements,
	edgeOffsets,
	getNodeRadius,
	edgeKey,
	computeEdgePath,
	setNodeEl,
	setEdgeEl,
	recomputeEdgeOffsets,
	startSimulation,
	setActiveAccessors,
	zoomToFit,
	setViewport,
	setAutoFit,
	reset,
	addNode,
	addEdge,
	onNodeMouseDown,
	onMouseMove,
	onMouseUp,
	getDragMoved,
} = useForceGraph(() => svgRef.value)

// Deepest depth in the graph; how many levels the slider shows.
const maxDepth = computed(() => nodes.value.reduce((max, node) => Math.max(max, node.depth), 0))
const depthLimit = ref(0)

// Rebuild the simulation over the current visible set so the layout reorganizes.
function refreshSimulation() {
	setAutoFit(true)
	startSimulation(0.4)
}

function toggleType(type: DepType) {
	const next = new Set(hiddenTypes.value)
	if (next.has(type)) next.delete(type)
	else next.add(type)
	hiddenTypes.value = next
	refreshSimulation()
}

function setDepthLimit(value: number) {
	depthLimit.value = value
	refreshSimulation()
}

const typeVisibleEdges = computed(() =>
	edges.value.filter((edge) => !hiddenTypes.value.has(edge.type)),
)

// Nodes reachable from the root within the depth limit.
const visibleNodeIds = computed(() => {
	const reachable = new Set<string>()
	const root = nodes.value.find((node) => node.isRoot)
	if (!root) return reachable

	const adjacency = new Map<string, string[]>()
	const addNeighbour = (from: string, to: string) => {
		const list = adjacency.get(from)
		if (list) list.push(to)
		else adjacency.set(from, [to])
	}
	for (const edge of typeVisibleEdges.value) {
		addNeighbour(edge.source, edge.target)
		addNeighbour(edge.target, edge.source)
	}

	const queue = [root.id]
	reachable.add(root.id)
	for (let i = 0; i < queue.length; i++) {
		for (const neighbour of adjacency.get(queue[i]) ?? []) {
			if (reachable.has(neighbour)) continue
			if ((nodeById.get(neighbour)?.depth ?? 0) > depthLimit.value) continue
			reachable.add(neighbour)
			queue.push(neighbour)
		}
	}
	return reachable
})

const visibleNodes = computed(() => nodes.value.filter((node) => visibleNodeIds.value.has(node.id)))

// Edges whose endpoints both survived the prune.
const visibleEdges = computed(() =>
	typeVisibleEdges.value.filter(
		(edge) => visibleNodeIds.value.has(edge.source) && visibleNodeIds.value.has(edge.target),
	),
)

setActiveAccessors(
	() => visibleNodes.value,
	() => visibleEdges.value,
)

// Not read in the template; applyHoverState updates DOM classes directly to avoid re-rendering.
const hoveredNodeId = ref<string | null>(null)
const searchQuery = ref('')

// Visible nodes whose name matches the search query; empty while the query has no matches.
const searchMatches = computed(() => {
	const query = searchQuery.value.trim().toLowerCase()
	if (!query) return []
	return visibleNodes.value.filter((node) =>
		(node.project?.name ?? node.id).toLowerCase().includes(query),
	)
})

// Separate from `nodeElements` so Vue's reactive `:class` on the `<g>` can't wipe our classList.
const dimElements = new Map<string, Element>()
function setDimEl(id: string, el: Element | null) {
	if (el) dimElements.set(id, el)
	else dimElements.delete(id)
}

let appliedDimmedNodeIds = new Set<string>()
let appliedDimmedEdgeKeys = new Set<string>()
let hoverFrame: number | null = null

function diffClass<E extends Element>(
	prev: Set<string>,
	next: Set<string>,
	elements: Map<string, E>,
	className: string,
) {
	for (const key of prev) if (!next.has(key)) elements.get(key)?.classList.remove(className)
	for (const key of next) if (!prev.has(key)) elements.get(key)?.classList.add(className)
}

function applyHoverState() {
	const searching = searchQuery.value.trim().length > 0

	// While searching, highlight matches and dim everything else (all nodes if there are none).
	let highlighted: Set<string> | null
	if (searching) {
		highlighted = new Set(searchMatches.value.map((node) => node.id))
	} else {
		const nodeId = hoveredNodeId.value
		highlighted = nodeId ? new Set<string>([nodeId]) : null
		if (highlighted) {
			for (const edge of visibleEdges.value) {
				if (edge.source === nodeId) highlighted.add(edge.target)
			}
		}
	}

	const nextDimmedNodes = new Set<string>()
	if (highlighted) {
		for (const node of visibleNodes.value) {
			if (!highlighted.has(node.id)) nextDimmedNodes.add(node.id)
		}
	}
	diffClass(appliedDimmedNodeIds, nextDimmedNodes, dimElements, 'mre-dimmed')
	appliedDimmedNodeIds = nextDimmedNodes

	const nextDimmedEdges = new Set<string>()
	if (searching) {
		const matchedIds = highlighted!
		for (const edge of visibleEdges.value) {
			if (!matchedIds.has(edge.source) && !matchedIds.has(edge.target)) {
				nextDimmedEdges.add(edgeKey(edge))
			}
		}
	} else if (hoveredNodeId.value) {
		for (const edge of visibleEdges.value) {
			if (edge.source !== hoveredNodeId.value) nextDimmedEdges.add(edgeKey(edge))
		}
	}
	diffClass(appliedDimmedEdgeKeys, nextDimmedEdges, edgeElements, 'mre-dimmed')
	appliedDimmedEdgeKeys = nextDimmedEdges
}

// Batches hover updates onto a single frame.
function scheduleHoverUpdate() {
	if (hoverFrame !== null) return
	hoverFrame = window.requestAnimationFrame(() => {
		hoverFrame = null
		applyHoverState()
	})
}

// Debounced so the view doesn't jump around while the user is still typing.
let searchZoomTimer: ReturnType<typeof setTimeout> | null = null
watch(searchQuery, () => {
	scheduleHoverUpdate()
	if (searchZoomTimer !== null) clearTimeout(searchZoomTimer)
	searchZoomTimer = setTimeout(() => {
		searchZoomTimer = null
		const matches = searchMatches.value
		if (matches.length > 0) zoomToFit(true, 100, matches)
	}, 400)
})

function onNodeDragStart(event: MouseEvent, node: GraphNode) {
	onNodeMouseDown(event, node)
	hoveredNodeId.value = node.id
}

function onNodeMouseEnter(node: GraphNode) {
	if (draggingNodeId.value && draggingNodeId.value !== node.id) return
	hoveredNodeId.value = node.id
}

function onNodeMouseLeave(node: GraphNode) {
	if (draggingNodeId.value === node.id) return
	if (hoveredNodeId.value === node.id) hoveredNodeId.value = null
}

function onCanvasMouseLeave() {
	onMouseUp()
	hoveredNodeId.value = null
}

watch(hoveredNodeId, scheduleHoverUpdate)

// Clear the hover if its node left view, and re-apply on structural changes.
watch([visibleNodeIds, visibleEdges], () => {
	if (hoveredNodeId.value && !visibleNodeIds.value.has(hoveredNodeId.value)) {
		hoveredNodeId.value = null
	}
	scheduleHoverUpdate()
})

onUnmounted(() => {
	if (hoverFrame !== null) window.cancelAnimationFrame(hoverFrame)
	if (searchZoomTimer !== null) clearTimeout(searchZoomTimer)
})

function clamp(s: string, max: number): string {
	return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// Node ids are project ids, so `sourceId` doubles as the source's project id.
function addDepsToGraph(sourceId: string, deps: EnrichedDep[], depth: number) {
	const source = nodeById.get(sourceId)
	const sx = source?.x ?? 0
	const sy = source?.y ?? 0

	const seen = new Set<string>()
	const toCreate = deps.filter((dep) => {
		if (dep.project_id === sourceId || nodeById.has(dep.project_id) || seen.has(dep.project_id)) {
			return false
		}
		seen.add(dep.project_id)
		return true
	})

	toCreate.forEach((dep, i) => {
		const angle = (i / Math.max(toCreate.length, 1)) * 2 * Math.PI
		const r = 80 + 30 * Math.floor(i / 8)
		addNode({
			id: dep.project_id,
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

	for (const dep of deps) {
		if (dep.project_id === sourceId) continue
		addEdge({
			source: sourceId,
			target: dep.project_id,
			type: dep.dependency_type as GraphEdge['type'],
		})
	}
}

async function initGraph() {
	reset()
	hoveredNodeId.value = null
	searchQuery.value = ''
	appliedDimmedNodeIds = new Set()
	appliedDimmedEdgeKeys = new Set()
	hiddenTypes.value = new Set()
	initialLoading.value = true
	loadingProgress.value = 0

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
		let frontier = [{ sourceId: rootId, dependencies: rootDependencies }]

		while (frontier.length > 0) {
			const dependencyTargets = frontier.flatMap(({ dependencies }) =>
				dependencies.filter(isGraphDependency),
			)
			const unexpandedDependencies = dependencyTargets.filter(
				(dependency) => !expandedProjectIds.has(dependency.project_id),
			)

			// Clamped so the bar never regresses.
			const discovered = expandedProjectIds.size + unexpandedDependencies.length
			loadingProgress.value = Math.max(
				loadingProgress.value,
				discovered > 0 ? (expandedProjectIds.size / discovered) * 100 : 100,
			)

			const { projects, dependenciesByProjectId } =
				await fetchDependencyGraphLayer(unexpandedDependencies)
			const projectsById = new Map(projects.map((project) => [project.id, project]))
			projectsById.set(rootId, rootProject)

			for (const { sourceId, dependencies } of frontier) {
				const source = nodeById.get(sourceId)
				addDepsToGraph(
					sourceId,
					buildEnrichedDeps(dependencies, projectsById),
					(source?.depth ?? 0) + 1,
				)
			}

			for (const dependency of unexpandedDependencies) {
				expandedProjectIds.add(dependency.project_id)
			}
			frontier = projects.map((project) => ({
				sourceId: project.id,
				dependencies: dependenciesByProjectId.get(project.id) ?? [],
			}))
		}

		depthLimit.value = maxDepth.value
		recomputeEdgeOffsets()
		setAutoFit(true)
		startSimulation()
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load dependency graph:', err)
	} finally {
		initialLoading.value = false
	}
}

function nodeHref(node: GraphNode): string | undefined {
	if (!node.project) return undefined
	return resolveLink(`/${node.project.project_types[0]}/${node.project.slug}`)
}

function onNodeLinkClick(event: MouseEvent, node: GraphNode) {
	// Let the browser handle natively
	if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
		return
	}
	event.preventDefault()
	if (getDragMoved() || !node.project) return
	modal.value?.hide()
	navigate(`/${node.project.project_types[0]}/${node.project.slug}`)
}

async function show() {
	modal.value?.show()
	await nextTick()
	const w = svgRef.value?.clientWidth ?? 960
	const h = svgRef.value?.clientHeight ?? 580
	setViewport(w / 2, h / 2, 1)
	initGraph()
}

defineExpose({ show })
</script>

<style scoped>
.mre-dimmed .mre-dim-target,
path.mre-dimmed {
	opacity: 0.2;
}

.mre-dimmed .mre-dim-overlay {
	opacity: 0.6;
}

.mre-dimmed .mre-hover-ring {
	opacity: 0 !important;
}
</style>
