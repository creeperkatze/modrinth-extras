import 'd3-transition'

import type { Labrinth } from '@modrinth/api-client'
import {
	forceCollide,
	forceLink,
	forceManyBody,
	forceRadial,
	forceSimulation,
	type Simulation,
	type SimulationLinkDatum,
} from 'd3-force'
import { select } from 'd3-selection'
import {
	type D3ZoomEvent,
	zoom as d3Zoom,
	type ZoomBehavior,
	zoomIdentity,
	type ZoomTransform,
} from 'd3-zoom'
import { markRaw, onUnmounted, ref, watch } from 'vue'

export interface GraphNode {
	id: string
	x: number
	y: number
	vx: number
	vy: number
	fx: number | null
	fy: number | null
	project: Labrinth.Projects.v3.Project | null
	isRoot: boolean
	depth: number
	index?: number
}

export interface GraphEdge {
	source: string
	target: string
	type: 'required' | 'optional' | 'embedded'
}

type D3Link = SimulationLinkDatum<GraphNode> & { type: GraphEdge['type'] }

interface ViewportOptions {
	animate?: boolean
	duration?: number
}

const VIEWPORT_TRANSITION_NAME = 'mre-viewport'
const VIEWPORT_TRANSITION_MS = 450
const WHEEL_ZOOM_SPEED = 0.0012
const EDGE_TARGET_GAP = 4

export const ROOT_NODE_RADIUS = 34
export const NODE_RADIUS = 22

export function useForceGraph(svgRef: () => SVGSVGElement | null) {
	const nodes = ref<GraphNode[]>([])
	const edges = ref<GraphEdge[]>([])
	const pan = ref({ x: 480, y: 290 })
	const zoom = ref(1)
	const panning = ref(false)
	const draggingNodeId = ref<string | null>(null)

	// Non-reactive; kept in sync with their reactive counterparts via addNode/addEdge
	const nodeById = new Map<string, GraphNode>()
	const edgeKeys = new Set<string>()
	const nodeElements = new Map<string, SVGGElement>()
	const edgeElements = new Map<string, SVGPathElement>()
	const edgeCurvatures = new Map<string, number>()

	let simulation: Simulation<GraphNode, D3Link> | null = null
	let draggingNode: GraphNode | null = null
	let dragStartMouse = { x: 0, y: 0 }
	let dragStartNode = { x: 0, y: 0 }
	let dragMoved = false
	// While set, the viewport refits on every tick so the whole graph stays framed as it
	// settles. Cleared when the simulation ends or the user pans/zooms/drags.
	let autoFit = false
	let zoomBehavior: ZoomBehavior<SVGSVGElement, unknown> | null = null

	// Subset of nodes/edges the simulation and view act on; the consumer can narrow it.
	let activeNodes: () => GraphNode[] = () => nodes.value
	let activeEdges: () => GraphEdge[] = () => edges.value

	function setActiveAccessors(getNodes: () => GraphNode[], getEdges: () => GraphEdge[]) {
		activeNodes = getNodes
		activeEdges = getEdges
	}

	function edgeKey(edge: GraphEdge): string {
		return `${edge.source}|||${edge.target}|||${edge.type}`
	}

	function getNodeRadius(node: GraphNode): number {
		return node.isRoot ? ROOT_NODE_RADIUS : NODE_RADIUS
	}

	function setNodeEl(id: string, el: Element | null) {
		if (el) nodeElements.set(id, el as SVGGElement)
		else nodeElements.delete(id)
	}

	function setEdgeEl(key: string, el: Element | null) {
		if (el) edgeElements.set(key, el as SVGPathElement)
		else edgeElements.delete(key)
	}

	function computeEdgePath(edge: GraphEdge, curvature: number): string {
		const src = nodeById.get(edge.source)
		const tgt = nodeById.get(edge.target)
		if (!src || !tgt) return ''
		const dx = tgt.x - src.x
		const dy = tgt.y - src.y
		const dist = Math.sqrt(dx * dx + dy * dy) || 1
		const ux = dx / dist
		const uy = dy / dist
		const x1 = src.x + ux * getNodeRadius(src)
		const y1 = src.y + uy * getNodeRadius(src)
		const x2 = tgt.x - ux * (getNodeRadius(tgt) + EDGE_TARGET_GAP)
		const y2 = tgt.y - uy * (getNodeRadius(tgt) + EDGE_TARGET_GAP)
		if (Math.abs(curvature) < 0.5) {
			return `M ${x1} ${y1} L ${x2} ${y2}`
		}
		// Bend perpendicular to a canonical direction so A>B and B>A curvatures don't cancel out
		const flip = edge.source < edge.target ? 1 : -1
		const cx = (x1 + x2) / 2 - uy * curvature * flip
		const cy = (y1 + y2) / 2 + ux * curvature * flip
		return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
	}

	// Direction-independent key for an edge's node pair
	function pairKey(edge: GraphEdge): string {
		return edge.source < edge.target
			? `${edge.source}|||${edge.target}`
			: `${edge.target}|||${edge.source}`
	}

	function recomputeCurvatures() {
		const counts = new Map<string, number>()
		for (const edge of edges.value) {
			counts.set(pairKey(edge), (counts.get(pairKey(edge)) ?? 0) + 1)
		}
		const groupIdx = new Map<string, number>()
		edgeCurvatures.clear()
		for (const edge of edges.value) {
			const key = pairKey(edge)
			const count = counts.get(key) ?? 1
			const idx = groupIdx.get(key) ?? 0
			groupIdx.set(key, idx + 1)
			edgeCurvatures.set(edgeKey(edge), count > 1 ? (idx - (count - 1) / 2) * 28 : 0)
		}
	}

	function updateImperative() {
		for (const node of activeNodes()) {
			const el = nodeElements.get(node.id)
			// CSS transform avoids the style/layout recalc the SVG attribute triggers.
			if (el) el.style.transform = `translate(${node.x}px, ${node.y}px)`
		}
		for (const edge of activeEdges()) {
			const key = edgeKey(edge)
			const el = edgeElements.get(key)
			if (el) el.setAttribute('d', computeEdgePath(edge, edgeCurvatures.get(key) ?? 0))
		}
	}

	function getD3Links(): D3Link[] {
		return activeEdges().map((e) => ({ source: e.source, target: e.target, type: e.type }))
	}

	function startSimulation(alpha = 1) {
		simulation?.stop()

		// Incident-edge count per node, busier deps get a wider ring
		const degree = new Map<string, number>()
		for (const edge of activeEdges()) {
			degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
			degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
		}
		const deg = (node: GraphNode) => degree.get(node.id) ?? 0
		const maxDepth = activeNodes().reduce((max, n) => Math.max(max, n.depth), 0)

		// Pin the root so the tree radiates from a fixed point; an existing pin
		// (e.g. after the user dragged the root) stays where it is.
		for (const node of activeNodes()) {
			if (node.isRoot && node.fx === null) {
				node.fx = node.x
				node.fy = node.y
			}
		}

		simulation = forceSimulation<GraphNode>(activeNodes())
			.alpha(alpha)
			// Local, degree-independent repulsion so re-heating can't fling rings out
			.force('charge', forceManyBody<GraphNode>().strength(-650).distanceMax(700))
			.force(
				'link',
				forceLink<GraphNode, D3Link>(getD3Links())
					.id((n) => n.id)
					// Fixed gap per edge; busier endpoints get a roomier ring (bubble)
					.distance((l) => {
						const s = l.source as GraphNode
						const t = l.target as GraphNode
						return getNodeRadius(s) + getNodeRadius(t) + 70 + Math.max(deg(s), deg(t)) * 6
					}),
				// d3's default link strength (1 / min degree) keeps hubs from collapsing together
			)
			.force(
				'collide',
				forceCollide<GraphNode>()
					.radius((n) => getNodeRadius(n) + 26)
					.strength(1),
			)
			// Concentric rings by depth; the pinned root anchors the graph, so no centring force
			.force(
				'radial',
				forceRadial<GraphNode>((n) => n.depth * 250, 0, 0).strength((n) =>
					n.isRoot || maxDepth === 0 ? 0 : 0.3,
				),
			)
			.alphaDecay(0.1)
			.velocityDecay(0.6)
			.on('tick', () => {
				updateImperative()
				if (autoFit) zoomToFit(false)
			})
			.on('end', () => {
				autoFit = false
			})
	}

	function applyZoomTransform(transform: ZoomTransform) {
		pan.value = { x: transform.x, y: transform.y }
		zoom.value = transform.k
	}

	function setZoomTransform(transform: ZoomTransform, options: ViewportOptions = {}) {
		const svgEl = svgRef()
		if (!svgEl || !zoomBehavior) {
			applyZoomTransform(transform)
			return
		}

		const selection = select(svgEl)
		selection.interrupt(VIEWPORT_TRANSITION_NAME)

		if (!options.animate) {
			selection.call(zoomBehavior.transform, transform)
			return
		}

		selection
			.transition(VIEWPORT_TRANSITION_NAME)
			.duration(options.duration ?? VIEWPORT_TRANSITION_MS)
			.call(zoomBehavior.transform, transform)
	}

	function setViewport(x: number, y: number, scale = zoom.value, options: ViewportOptions = {}) {
		setZoomTransform(zoomIdentity.translate(x, y).scale(scale), options)
	}

	function zoomToFit(animate = true, padding = 80) {
		const fitNodes = activeNodes()
		if (fitNodes.length === 0) return
		const svgEl = svgRef()
		if (!svgEl) return
		const w = svgEl.clientWidth
		const h = svgEl.clientHeight
		let minX = Infinity,
			maxX = -Infinity,
			minY = Infinity,
			maxY = -Infinity
		for (const node of fitNodes) {
			const r = getNodeRadius(node) + 14
			minX = Math.min(minX, node.x - r)
			maxX = Math.max(maxX, node.x + r)
			minY = Math.min(minY, node.y - r)
			maxY = Math.max(maxY, node.y + r)
		}
		const graphW = maxX - minX || 1
		const graphH = maxY - minY || 1
		const scale = Math.min((w - padding * 2) / graphW, (h - padding * 2) / graphH, 1.2)
		setViewport(
			(w - graphW * scale) / 2 - minX * scale,
			(h - graphH * scale) / 2 - minY * scale,
			scale,
			{ animate },
		)
	}

	function addNode(node: GraphNode) {
		markRaw(node)
		nodes.value.push(node)
		nodeById.set(node.id, node)
	}

	function addEdge(edge: GraphEdge) {
		const key = edgeKey(edge)
		if (edgeKeys.has(key)) return
		edgeKeys.add(key)
		edges.value.push(edge)
	}

	function reset() {
		simulation?.stop()
		simulation = null
		nodes.value = []
		edges.value = []
		nodeById.clear()
		edgeKeys.clear()
		nodeElements.clear()
		edgeElements.clear()
		edgeCurvatures.clear()
		draggingNode = null
		draggingNodeId.value = null
		panning.value = false
		setViewport(pan.value.x, pan.value.y, 1, { animate: false })
	}

	function onNodeMouseDown(event: MouseEvent, node: GraphNode) {
		if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
			return
		}
		event.preventDefault()
		autoFit = false
		draggingNode = node
		draggingNodeId.value = node.id
		dragStartMouse = { x: event.clientX, y: event.clientY }
		dragStartNode = { x: node.x, y: node.y }
		dragMoved = false
		node.fx = node.x
		node.fy = node.y
		// Keep the simulation warm for the whole drag
		simulation?.alphaTarget(0.15).restart()
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
		}
	}

	function onMouseUp() {
		if (draggingNode) {
			// The root stays pinned wherever it's dropped; other nodes rejoin the sim.
			if (!draggingNode.isRoot) {
				draggingNode.fx = null
				draggingNode.fy = null
			}
			simulation?.alphaTarget(0)
			draggingNode = null
			draggingNodeId.value = null
		}
		panning.value = false
	}

	function getDragMoved() {
		return dragMoved
	}

	function setAutoFit(v: boolean) {
		autoFit = v
	}

	const stopZoomWatch = watch(
		svgRef,
		(svgEl, _oldSvgEl, onCleanup) => {
			if (!svgEl) return

			zoomBehavior = d3Zoom<SVGSVGElement, unknown>()
				.scaleExtent([0.15, 4])
				.duration(300)
				.wheelDelta((event) => {
					const modeMultiplier = event.deltaMode === 1 ? 25 : event.deltaMode ? 500 : 1
					const pinchMultiplier = event.ctrlKey ? 8 : 1
					return -event.deltaY * modeMultiplier * WHEEL_ZOOM_SPEED * pinchMultiplier
				})
				.on('start', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
					if (!event.sourceEvent) return
					autoFit = false
					select(svgEl).interrupt(VIEWPORT_TRANSITION_NAME)
					if (event.sourceEvent.type !== 'wheel') panning.value = true
				})
				.on('zoom', (event: D3ZoomEvent<SVGSVGElement, unknown>) => {
					applyZoomTransform(event.transform)
				})
				.on('end', () => {
					panning.value = false
				})

			const selection = select(svgEl).call(zoomBehavior)
			selection.call(
				zoomBehavior.transform,
				zoomIdentity.translate(pan.value.x, pan.value.y).scale(zoom.value),
			)

			onCleanup(() => {
				selection.interrupt(VIEWPORT_TRANSITION_NAME)
				selection.on('.zoom', null)
				zoomBehavior = null
				panning.value = false
			})
		},
		{ flush: 'post' },
	)

	onUnmounted(() => {
		stopZoomWatch()
		simulation?.stop()
	})

	return {
		nodes,
		edges,
		pan,
		zoom,
		panning,
		draggingNodeId,
		nodeById,
		nodeElements,
		edgeElements,
		edgeCurvatures,
		getNodeRadius,
		edgeKey,
		computeEdgePath,
		setNodeEl,
		setEdgeEl,
		recomputeCurvatures,
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
	}
}
