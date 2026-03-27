<template>
	<NewModal
		ref="modal"
		header="Dependency Graph"
		:closable="true"
		:no-padding="true"
		max-width="min(96vw, 1400px)"
		width="min(92vw, 1300px)"
	>
		<div
			ref="containerRef"
			class="relative overflow-hidden"
			style="height: 580px; background: #111"
			@mousemove="onMouseMove"
			@mouseup="onMouseUp"
			@mouseleave="onMouseUp"
		>
			<svg
				ref="svgRef"
				class="block w-full h-full"
				:style="{ cursor: panning ? 'grabbing' : 'grab' }"
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
						<circle cx="14" cy="14" r="0.7" fill="rgba(255,255,255,0.055)" />
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
						<path d="M 0 0 L 12 5 L 0 10 Z" fill="#4ade80" />
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
						<path d="M 0 0 L 12 5 L 0 10 Z" fill="#888" />
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
						<path d="M 0 0 L 12 5 L 0 10 Z" fill="#60a5fa" />
					</marker>
					<template v-for="node in nodes" :key="`clip-${node.id}`">
						<clipPath :id="`mre-clip-${escId(node.id)}`">
							<circle :r="nodeR(node)" />
						</clipPath>
					</template>
				</defs>

				<!-- Background rect catches all pointer events that miss nodes, enabling pan -->
				<rect
					width="100%"
					height="100%"
					fill="url(#mre-explorer-grid)"
					@mousedown="onBgMouseDown"
				/>

				<g
					v-if="!initialLoading"
					:data-v="renderVersion"
					:transform="`translate(${pan.x},${pan.y}) scale(${zoom})`"
				>
					<!-- Edges -->
					<g style="pointer-events: none">
						<path
							v-for="edge in edgesWithCurvature"
							:key="`e-${edge.source}-${edge.target}-${edge.type}`"
							:d="edgePath(edge, edge.curvature)"
							:stroke="EDGE_COLORS[edge.type]"
							stroke-width="1.5"
							stroke-linecap="round"
							fill="none"
							opacity="0.6"
							:marker-end="`url(#mre-arrow-${edge.type})`"
						/>
					</g>

					<!-- Nodes -->
					<g
						v-for="node in nodes"
						:key="node.id"
						class="mre-node-group"
						:transform="`translate(${node.x},${node.y})`"
						:style="nodeGroupStyle(node)"
						@mousedown.stop="onNodeMouseDown($event, node)"
						@click.stop="onNodeClick(node)"
					>
						<!-- Root glow ring -->
						<circle
							v-if="node.isRoot"
							:r="nodeR(node) + 9"
							fill="none"
							stroke="#1bd96a"
							stroke-width="1.5"
							class="mre-explorer-pulse"
						/>

						<!-- Hover ring -->
						<circle
							v-if="!node.loading"
							class="mre-hover-ring"
							:r="nodeR(node) + 5"
							fill="none"
							stroke="#ccc"
							stroke-width="1.5"
							style="pointer-events: none"
						/>

						<!-- Body -->
						<circle
							:r="nodeR(node)"
							:fill="node.isRoot ? '#1bd96a' : '#262626'"
							:stroke="node.isRoot ? '#1bd96a' : '#3f3f3f'"
							stroke-width="1.5"
						/>

						<!-- Letter fallback -->
						<text
							text-anchor="middle"
							dominant-baseline="central"
							:font-size="node.isRoot ? '17' : '13'"
							font-weight="bold"
							:fill="node.isRoot ? '#fff' : '#888'"
							style="pointer-events: none; user-select: none"
						>
							{{ (node.project?.title ?? node.id)[0].toUpperCase() }}
						</text>

						<!-- Project icon -->
						<image
							v-if="node.project?.icon_url"
							:href="node.project.icon_url"
							:x="-nodeR(node)"
							:y="-nodeR(node)"
							:width="nodeR(node) * 2"
							:height="nodeR(node) * 2"
							:clip-path="`url(#mre-clip-${escId(node.id)})`"
							style="pointer-events: none"
						/>

						<!-- Loading spinner ring -->
						<circle
							v-if="node.loading"
							class="mre-spinner"
							:r="nodeR(node) + 4"
							fill="none"
							stroke="#1bd96a"
							stroke-width="2"
							stroke-linecap="round"
							:stroke-dasharray="`${(nodeR(node) + 4) * Math.PI * 0.5} ${(nodeR(node) + 4) * Math.PI * 1.5}`"
							style="pointer-events: none"
						/>

						<!-- Expand badge (+ icon for unexpanded non-root nodes) -->
						<g v-if="!node.isRoot && !node.loaded && !node.loading" style="pointer-events: none">
							<circle
								:cx="nodeR(node) - 5"
								:cy="-(nodeR(node) - 5)"
								r="8"
								fill="#1a1a1a"
								stroke="#1bd96a"
								stroke-width="1.5"
							/>
							<text
								:x="nodeR(node) - 5"
								:y="-(nodeR(node) - 5)"
								text-anchor="middle"
								dominant-baseline="central"
								font-size="11"
								font-weight="bold"
								fill="#1bd96a"
								style="user-select: none"
							>
								+
							</text>
						</g>

						<!-- Label -->
						<text
							:y="nodeR(node) + 14"
							text-anchor="middle"
							:font-size="node.isRoot ? '12' : '10'"
							:font-weight="node.isRoot ? '600' : '400'"
							fill="#ccc"
							:class="node.loaded && node.project && !node.isRoot ? 'mre-nav-label' : ''"
							style="pointer-events: none; user-select: none"
						>
							{{ clamp(node.project?.title ?? node.id, 22) }}
						</text>
					</g>
				</g>

				<!-- Empty state -->
				<text
					v-if="!initialLoading && nodes.length === 0"
					x="50%"
					y="50%"
					text-anchor="middle"
					dominant-baseline="central"
					fill="#666"
					font-size="14"
				>
					This project has no dependencies
				</text>
			</svg>

			<!-- Loading state (outside SVG so we get a real spinner) -->
			<div
				v-if="initialLoading"
				class="absolute inset-0 flex items-center justify-center gap-2"
				style="color: #666; font-size: 14px; pointer-events: none"
			>
				<svg
					class="animate-spin"
					xmlns="http://www.w3.org/2000/svg"
					width="16"
					height="16"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M21 12a9 9 0 1 1-6.219-8.56" />
				</svg>
				Loading
			</div>

			<!-- Legend -->
			<div
				class="absolute bottom-3 left-3 flex flex-col gap-2 rounded-lg p-3"
				style="background: rgba(20, 20, 20, 0.92); border: 1px solid #2e2e2e; font-size: 12px"
			>
				<div v-for="item in LEGEND" :key="item.type" class="flex items-center gap-2.5">
					<svg width="40" height="14" style="flex-shrink: 0">
						<line x1="1" y1="7" x2="29" y2="7" :stroke="item.color" stroke-width="1.5" />
						<polygon :points="'22,3 38,7 22,11'" :fill="item.color" />
					</svg>
					<span style="color: #777">{{ item.label }}</span>
				</div>
			</div>

			<!-- Controls hint -->
			<div
				class="absolute bottom-3 right-3"
				style="font-size: 11px; color: #555; pointer-events: none"
			>
				scroll to zoom · drag to pan · click to expand
			</div>
		</div>
	</NewModal>
</template>

<script setup lang="ts">
import { NewModal } from '@modrinth/ui'
import type { ForceLink, Simulation, SimulationLinkDatum } from 'd3-force'
import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation } from 'd3-force'
import { computed, markRaw, nextTick, onUnmounted, ref, useTemplateRef } from 'vue'

import { apiFetch } from '../helpers/apiFetch'
import {
	type EnrichedDep,
	fetchProjectDependencies,
	fetchVersionDependencies,
	type ProjectInfo,
} from '../helpers/dependencies'
import { navigate } from '../helpers/page-router'

interface GraphNode {
	id: string
	x: number
	y: number
	vx: number
	vy: number
	fx: number | null
	fy: number | null
	project: ProjectInfo | null
	loaded: boolean
	loading: boolean
	isRoot: boolean
	depth: number
	index?: number
}

interface GraphEdge {
	source: string
	target: string
	type: 'required' | 'optional' | 'embedded'
}

// d3 mutates source/target to node refs after binding; keep separate from GraphEdge
type D3Link = SimulationLinkDatum<GraphNode> & { type: GraphEdge['type'] }

const EDGE_COLORS: Record<string, string> = {
	required: '#4ade80',
	optional: '#888',
	embedded: '#60a5fa',
}

const LEGEND = [
	{ type: 'required', color: '#4ade80', label: 'Required' },
	{ type: 'optional', color: '#888', label: 'Optional' },
	{ type: 'embedded', color: '#60a5fa', label: 'Embedded' },
]

const edgesWithCurvature = computed(() => {
	const counts = new Map<string, number>()
	for (const edge of edges.value) {
		const key = [edge.source, edge.target].sort().join('|||')
		counts.set(key, (counts.get(key) ?? 0) + 1)
	}
	const groupIdx = new Map<string, number>()
	return edges.value.map((edge) => {
		const key = [edge.source, edge.target].sort().join('|||')
		const count = counts.get(key) ?? 1
		const idx = groupIdx.get(key) ?? 0
		groupIdx.set(key, idx + 1)
		const curvature = count > 1 ? (idx - (count - 1) / 2) * 28 : 0
		return { ...edge, curvature }
	})
})

function edgePath(edge: GraphEdge, curvature: number): string {
	const src = nodePos(edge.source)
	const tgt = nodePos(edge.target)
	const dx = tgt.x - src.x
	const dy = tgt.y - src.y
	const dist = Math.sqrt(dx * dx + dy * dy) || 1
	const ux = dx / dist
	const uy = dy / dist
	const srcNode = nodes.value.find((n) => n.id === edge.source)
	const tgtNode = nodes.value.find((n) => n.id === edge.target)
	const r1 = srcNode ? nodeR(srcNode) : 22
	const r2 = tgtNode ? nodeR(tgtNode) : 22
	const x1 = src.x + ux * r1
	const y1 = src.y + uy * r1
	const x2 = tgt.x - ux * r2
	const y2 = tgt.y - uy * r2
	if (Math.abs(curvature) < 0.5) {
		return `M ${x1} ${y1} L ${x2} ${y2}`
	}
	const mx = (x1 + x2) / 2
	const my = (y1 + y2) / 2
	// Use a canonical direction (sorted IDs) so that A→B and B→A both measure
	// their perpendicular offset from the same axis — otherwise the flipped
	// direction vector cancels the curvature and both curves land on the same side.
	const [canonA, canonB] = [edge.source, edge.target].sort()
	const posA = nodePos(canonA)
	const posB = nodePos(canonB)
	const cdx = posB.x - posA.x
	const cdy = posB.y - posA.y
	const cdist = Math.sqrt(cdx * cdx + cdy * cdy) || 1
	const cx = mx + (-cdy / cdist) * curvature
	const cy = my + (cdx / cdist) * curvature
	return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
}

const props = defineProps<{ projectSlug: string; versionNumber?: string }>()

const modal = useTemplateRef<InstanceType<typeof NewModal>>('modal')
const svgRef = ref<SVGSVGElement | null>(null)
const containerRef = ref<HTMLDivElement | null>(null)

// nodes array is reactive for v-for; individual nodes are markRaw so d3 mutates freely
const nodes = ref<GraphNode[]>([])
const edges = ref<GraphEdge[]>([])
const initialLoading = ref(false)
const renderVersion = ref(0)

const pan = ref({ x: 480, y: 290 })
const zoom = ref(1)

let draggingNode: GraphNode | null = null
let dragStartMouse = { x: 0, y: 0 }
let dragStartNode = { x: 0, y: 0 }
let dragMoved = false

let panning = false
let panStart = { mx: 0, my: 0, px: 0, py: 0 }

let simulation: Simulation<GraphNode, D3Link> | null = null
let fitOnSettle = false

// Helpers

function nodeR(node: GraphNode): number {
	return node.isRoot ? 28 : 22
}

function nodeGroupStyle(node: GraphNode): Record<string, string> {
	return { cursor: draggingNode?.id === node.id ? 'grabbing' : 'pointer' }
}

function escId(id: string): string {
	return id.replace(/[^a-zA-Z0-9]/g, '_')
}

function nodePos(id: string): { x: number; y: number } {
	return nodes.value.find((n) => n.id === id) ?? { x: 0, y: 0 }
}

function clamp(s: string, max: number): string {
	return s.length > max ? s.slice(0, max - 1) + '…' : s
}

// Simulation

function getD3Links(): D3Link[] {
	return edges.value.map((e) => ({ source: e.source, target: e.target, type: e.type }))
}

function startSimulation() {
	simulation?.stop()

	simulation = forceSimulation<GraphNode>(nodes.value)
		.force('charge', forceManyBody<GraphNode>().strength(-1200))
		.force(
			'link',
			forceLink<GraphNode, D3Link>(getD3Links())
				.id((n) => n.id)
				.distance(10)
				.strength(0.25),
		)
		.force(
			'collide',
			forceCollide<GraphNode>()
				.radius((n) => nodeR(n) + 14)
				.strength(0.9),
		)
		.force('center', forceCenter(0, 0).strength(0.02))
		.alphaDecay(0.04)
		.velocityDecay(0.8)
		.on('tick', () => {
			renderVersion.value++
		})
		.on('end', () => {
			if (fitOnSettle) {
				fitOnSettle = false
				zoomToFit()
			}
		})
}

function kickSimulation(hasNewNodes = true) {
	if (!simulation) return
	simulation.nodes(nodes.value)
	simulation.force<ForceLink<GraphNode, D3Link>>('link')?.links(getD3Links())
	const kickAlpha = hasNewNodes ? 0.4 : 0.08
	simulation.alpha(Math.max(simulation.alpha(), kickAlpha)).restart()
}

function zoomToFit(padding = 80) {
	if (nodes.value.length === 0) return
	const svgEl = svgRef.value
	if (!svgEl) return
	const w = svgEl.clientWidth
	const h = svgEl.clientHeight
	let minX = Infinity,
		maxX = -Infinity,
		minY = Infinity,
		maxY = -Infinity
	for (const node of nodes.value) {
		const r = nodeR(node) + 14
		minX = Math.min(minX, node.x - r)
		maxX = Math.max(maxX, node.x + r)
		minY = Math.min(minY, node.y - r)
		maxY = Math.max(maxY, node.y + r)
	}
	const graphW = maxX - minX || 1
	const graphH = maxY - minY || 1
	const scale = Math.min((w - padding * 2) / graphW, (h - padding * 2) / graphH, 1.2)
	zoom.value = scale
	pan.value = {
		x: (w - graphW * scale) / 2 - minX * scale,
		y: (h - graphH * scale) / 2 - minY * scale,
	}
}

onUnmounted(() => {
	simulation?.stop()
})

// Graph building

function addDepsToGraph(
	sourceId: string,
	sourceProjectId: string,
	deps: EnrichedDep[],
	depth: number,
): boolean {
	const existingIds = new Set(nodes.value.map((n) => n.id))
	const source = nodes.value.find((n) => n.id === sourceId)
	const sx = source?.x ?? 0
	const sy = source?.y ?? 0

	// Assign each dep its node ID: self-deps get a fully opaque unique ID so d3 never
	// deduplicates them, while regular deps use their actual project ID.
	const withIds = deps.map((d, i) => ({
		dep: d,
		nodeId:
			d.project_id === sourceProjectId
				? `__selfdep__${Date.now().toString(36)}${i.toString(36)}${Math.random().toString(36).slice(2)}`
				: d.project_id,
	}))

	// Self-deps always get a new node; regular deps only if not already in the graph
	const toCreate = withIds.filter(
		({ dep, nodeId }) => dep.project_id === sourceProjectId || !existingIds.has(nodeId),
	)

	toCreate.forEach(({ dep, nodeId }, i) => {
		const angle = (i / Math.max(toCreate.length, 1)) * 2 * Math.PI
		const r = 80 + 30 * Math.floor(i / 8)
		nodes.value.push(
			markRaw({
				id: nodeId,
				x: sx + r * Math.cos(angle),
				y: sy + r * Math.sin(angle),
				vx: 0,
				vy: 0,
				fx: null,
				fy: null,
				project: dep.project,
				loaded: false,
				loading: false,
				isRoot: false,
				depth,
			}),
		)
	})

	for (const { dep, nodeId } of withIds) {
		if (
			!edges.value.some(
				(e) => e.source === sourceId && e.target === nodeId && e.type === dep.dependency_type,
			)
		) {
			edges.value.push({
				source: sourceId,
				target: nodeId,
				type: dep.dependency_type as 'required' | 'optional' | 'embedded',
			})
		}
	}

	// Self-dep clones share the same dependencies — connect them to sibling deps
	for (const { dep: selfDep, nodeId: selfId } of withIds) {
		if (selfDep.project_id !== sourceProjectId) continue
		for (const { dep: sibling, nodeId: siblingId } of withIds) {
			if (sibling.project_id === sourceProjectId) continue
			edges.value.push({
				source: selfId,
				target: siblingId,
				type: sibling.dependency_type as 'required' | 'optional' | 'embedded',
			})
		}
	}

	return toCreate.length > 0
}

// Graph initialization

async function initGraph() {
	nodes.value = []
	edges.value = []
	initialLoading.value = true
	zoom.value = 1

	let rootProject: ProjectInfo | null = null
	try {
		rootProject = (await apiFetch(`project/${props.projectSlug}`)) as ProjectInfo
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch root project info:', err)
	}

	const rootId = rootProject?.id ?? props.projectSlug
	nodes.value.push(
		markRaw({
			id: rootId,
			x: 0,
			y: 0,
			vx: 0,
			vy: 0,
			fx: null,
			fy: null,
			project: rootProject,
			loaded: false,
			loading: false,
			isRoot: true,
			depth: 0,
		}),
	)

	try {
		const deps = props.versionNumber
			? await fetchVersionDependencies(props.projectSlug, props.versionNumber)
			: await fetchProjectDependencies(props.projectSlug)
		if (deps.length > 0) {
			addDepsToGraph(rootId, rootId, deps, 1)
		}
		nodes.value[0].loaded = true
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch dependencies for graph:', err)
	} finally {
		initialLoading.value = false
	}

	fitOnSettle = true
	startSimulation()
}

// Node expansion

async function expandNode(node: GraphNode) {
	if (node.loaded || node.loading) return

	node.loading = true
	try {
		const slug = node.project?.slug ?? node.id
		const isRootProject = node.project?.id === nodes.value[0]?.project?.id
		const deps =
			isRootProject && props.versionNumber
				? await fetchVersionDependencies(slug, props.versionNumber)
				: await fetchProjectDependencies(slug)
		const hasNewNodes = addDepsToGraph(node.id, node.project?.id ?? node.id, deps, node.depth + 1)
		node.loaded = true
		kickSimulation(hasNewNodes)
	} catch (err) {
		console.error('[Modrinth Extras] Failed to expand dependency node:', err)
	} finally {
		node.loading = false
	}
}

// Interaction

function onNodeMouseDown(event: MouseEvent, node: GraphNode) {
	event.preventDefault()
	draggingNode = node
	dragStartMouse = { x: event.clientX, y: event.clientY }
	dragStartNode = { x: node.x, y: node.y }
	dragMoved = false
	node.fx = node.x
	node.fy = node.y
	simulation?.alphaTarget(0.3).restart()
}

function onBgMouseDown(event: MouseEvent) {
	panning = true
	panStart = { mx: event.clientX, my: event.clientY, px: pan.value.x, py: pan.value.y }
}

function onMouseMove(event: MouseEvent) {
	if (draggingNode) {
		const dx = event.clientX - dragStartMouse.x
		const dy = event.clientY - dragStartMouse.y
		if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true
		draggingNode.fx = dragStartNode.x + dx / zoom.value
		draggingNode.fy = dragStartNode.y + dy / zoom.value
		draggingNode.x = draggingNode.fx
		draggingNode.y = draggingNode.fy
	} else if (panning) {
		pan.value = {
			x: panStart.px + (event.clientX - panStart.mx),
			y: panStart.py + (event.clientY - panStart.my),
		}
	}
}

function onMouseUp() {
	if (draggingNode) {
		draggingNode.fx = null
		draggingNode.fy = null
		simulation?.alphaTarget(0)
		draggingNode = null
	}
	panning = false
}

function onNodeClick(node: GraphNode) {
	if (dragMoved) return

	if (!node.loaded && !node.loading) {
		expandNode(node)
	} else if (node.project && !node.isRoot) {
		modal.value?.hide()
		navigate(`/${node.project.project_type}/${node.project.slug}`)
	}
}

function onWheel(event: WheelEvent) {
	const el = svgRef.value
	if (!el) return
	const rect = el.getBoundingClientRect()
	const mx = event.clientX - rect.left
	const my = event.clientY - rect.top
	const factor = event.deltaY > 0 ? 0.85 : 1 / 0.85
	const newZoom = Math.max(0.15, Math.min(4, zoom.value * factor))
	pan.value = {
		x: mx - (mx - pan.value.x) * (newZoom / zoom.value),
		y: my - (my - pan.value.y) * (newZoom / zoom.value),
	}
	zoom.value = newZoom
}

// Public API

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

.mre-node-group .mre-hover-ring {
	opacity: 0;
	transition: opacity 0.15s ease;
}

.mre-node-group:hover .mre-hover-ring {
	opacity: 1;
}

.mre-node-group:hover .mre-nav-label {
	text-decoration: underline;
}

.mre-spinner {
	animation: mre-spin 0.8s linear infinite;
	transform-origin: center;
	transform-box: fill-box;
}

@keyframes mre-spin {
	from {
		transform: rotate(0deg);
	}
	to {
		transform: rotate(360deg);
	}
}
</style>
