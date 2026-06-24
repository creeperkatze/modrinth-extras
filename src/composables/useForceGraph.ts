import type { Labrinth } from '@modrinth/api-client'
import type { ForceLink, Simulation, SimulationLinkDatum } from 'd3-force'
import {
	forceCenter,
	forceCollide,
	forceLink,
	forceManyBody,
	forceRadial,
	forceSimulation,
} from 'd3-force'
import { markRaw, onUnmounted, ref } from 'vue'

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

export function useForceGraph(svgRef: () => SVGSVGElement | null) {
	const nodes = ref<GraphNode[]>([])
	const edges = ref<GraphEdge[]>([])
	const pan = ref({ x: 480, y: 290 })
	const zoom = ref(1)
	const panning = ref(false)
	const draggingNodeId = ref<string | null>(null)

	// Non-reactive; kept in sync with their reactive counterparts via addNode/addEdge
	const nodeById = new Map<string, GraphNode>()
	const nodeElements = new Map<string, SVGGElement>()
	const edgeElements = new Map<string, SVGPathElement>()
	const edgeCurvatures = new Map<string, number>()

	let simulation: Simulation<GraphNode, D3Link> | null = null
	let draggingNode: GraphNode | null = null
	let dragStartMouse = { x: 0, y: 0 }
	let dragStartNode = { x: 0, y: 0 }
	let dragMoved = false
	let panStart = { mx: 0, my: 0, px: 0, py: 0 }
	let fitOnSettle = false

	function edgeKey(edge: GraphEdge): string {
		return `${edge.source}|||${edge.target}|||${edge.type}`
	}

	function nodeR(node: GraphNode): number {
		return node.isRoot ? 28 : 22
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
		const src = nodeById.get(edge.source) ?? { x: 0, y: 0 }
		const tgt = nodeById.get(edge.target) ?? { x: 0, y: 0 }
		const dx = tgt.x - src.x
		const dy = tgt.y - src.y
		const dist = Math.sqrt(dx * dx + dy * dy) || 1
		const ux = dx / dist
		const uy = dy / dist
		const srcNode = nodeById.get(edge.source)
		const tgtNode = nodeById.get(edge.target)
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
		// Use a canonical direction so A>B and B>A curvatures don't cancel each other out
		const [canonA, canonB] = [edge.source, edge.target].sort()
		const posA = nodeById.get(canonA) ?? { x: 0, y: 0 }
		const posB = nodeById.get(canonB) ?? { x: 0, y: 0 }
		const cdx = posB.x - posA.x
		const cdy = posB.y - posA.y
		const cdist = Math.sqrt(cdx * cdx + cdy * cdy) || 1
		const cx = mx + (-cdy / cdist) * curvature
		const cy = my + (cdx / cdist) * curvature
		return `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`
	}

	function recomputeCurvatures() {
		const counts = new Map<string, number>()
		for (const edge of edges.value) {
			const key = [edge.source, edge.target].sort().join('|||')
			counts.set(key, (counts.get(key) ?? 0) + 1)
		}
		const groupIdx = new Map<string, number>()
		edgeCurvatures.clear()
		for (const edge of edges.value) {
			const key = [edge.source, edge.target].sort().join('|||')
			const count = counts.get(key) ?? 1
			const idx = groupIdx.get(key) ?? 0
			groupIdx.set(key, idx + 1)
			edgeCurvatures.set(edgeKey(edge), count > 1 ? (idx - (count - 1) / 2) * 28 : 0)
		}
	}

	function updateImperative() {
		for (const node of nodes.value) {
			const el = nodeElements.get(node.id)
			if (el) el.setAttribute('transform', `translate(${node.x},${node.y})`)
		}
		for (const edge of edges.value) {
			const key = edgeKey(edge)
			const el = edgeElements.get(key)
			if (el) el.setAttribute('d', computeEdgePath(edge, edgeCurvatures.get(key) ?? 0))
		}
	}

	function getD3Links(): D3Link[] {
		return edges.value.map((e) => ({ source: e.source, target: e.target, type: e.type }))
	}

	function startSimulation() {
		simulation?.stop()

		// Incident-edge count per node; hubs have a high degree and get more room.
		const degree = new Map<string, number>()
		for (const edge of edges.value) {
			degree.set(edge.source, (degree.get(edge.source) ?? 0) + 1)
			degree.set(edge.target, (degree.get(edge.target) ?? 0) + 1)
		}
		const deg = (node: GraphNode) => degree.get(node.id) ?? 0
		const maxDepth = nodes.value.reduce((max, n) => Math.max(max, n.depth), 0)

		// Pin the root at the centre so the tree radiates from a fixed point.
		for (const node of nodes.value) {
			if (node.isRoot) {
				node.x = 0
				node.y = 0
				node.fx = 0
				node.fy = 0
			}
		}

		simulation = forceSimulation<GraphNode>(nodes.value)
			.force(
				'charge',
				forceManyBody<GraphNode>()
					// Hubs repel harder so their dependents fan out instead of clumping.
					.strength((n) => (n.isRoot ? -800 : -350 - deg(n) * 140))
					.distanceMax(1200),
			)
			.force(
				'link',
				forceLink<GraphNode, D3Link>(getD3Links())
					.id((n) => n.id)
					// Busy endpoints sit further apart, leaving room for satellites.
					.distance((l) => {
						const s = l.source as GraphNode
						const t = l.target as GraphNode
						return 70 + Math.max(deg(s), deg(t)) * 6
					})
					// Weak pull on hubs so they don't drag the graph into one knot.
					.strength((l) => {
						const s = l.source as GraphNode
						const t = l.target as GraphNode
						return 1 / Math.min(deg(s) || 1, deg(t) || 1)
					}),
			)
			.force(
				'collide',
				forceCollide<GraphNode>()
					.radius((n) => nodeR(n) + 16)
					.strength(1),
			)
			// Lay nodes in concentric rings by depth so the tree radiates outward.
			.force(
				'radial',
				forceRadial<GraphNode>((n) => n.depth * 180, 0, 0).strength((n) =>
					n.isRoot || maxDepth === 0 ? 0 : 0.45,
				),
			)
			.force('center', forceCenter(0, 0).strength(0.03))
			.alphaDecay(0.0228)
			.velocityDecay(0.45)
			.on('tick', updateImperative)
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
		simulation.alpha(Math.max(simulation.alpha(), hasNewNodes ? 0.4 : 0.08)).restart()
	}

	function zoomToFit(padding = 80) {
		if (nodes.value.length === 0) return
		const svgEl = svgRef()
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

	function addNode(node: GraphNode) {
		markRaw(node)
		nodes.value.push(node)
		nodeById.set(node.id, node)
	}

	function addEdge(edge: GraphEdge) {
		edges.value.push(edge)
	}

	function reset() {
		simulation?.stop()
		simulation = null
		nodes.value = []
		edges.value = []
		nodeById.clear()
		nodeElements.clear()
		edgeElements.clear()
		edgeCurvatures.clear()
		draggingNode = null
		draggingNodeId.value = null
		panning.value = false
		zoom.value = 1
	}

	function onNodeMouseDown(event: MouseEvent, node: GraphNode) {
		if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) {
			return
		}
		event.preventDefault()
		draggingNode = node
		draggingNodeId.value = node.id
		dragStartMouse = { x: event.clientX, y: event.clientY }
		dragStartNode = { x: node.x, y: node.y }
		dragMoved = false
		node.fx = node.x
		node.fy = node.y
		simulation?.alphaTarget(0.3).restart()
	}

	function onBgMouseDown(event: MouseEvent) {
		panning.value = true
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
		} else if (panning.value) {
			pan.value = {
				x: panStart.px + (event.clientX - panStart.mx),
				y: panStart.py + (event.clientY - panStart.my),
			}
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

	function onWheel(event: WheelEvent) {
		const svgEl = svgRef()
		if (!svgEl) return
		const rect = svgEl.getBoundingClientRect()
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

	function getDragMoved() {
		return dragMoved
	}

	function setFitOnSettle(v: boolean) {
		fitOnSettle = v
	}

	onUnmounted(() => simulation?.stop())

	return {
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
		kickSimulation,
		zoomToFit,
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
	}
}
