import { sidebarCards } from './cards'

const SNAP_DURATION = 200
const SCROLL_EDGE = 64
const SCROLL_SPEED = 14
const INDICATOR_HEIGHT = 3
// Where the line sits when there is no card on one side of it
const EDGE_GAP = 6

function prefersReducedMotion(): boolean {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Cards that render nothing on this page can't be dropped against
function visibleCards(sidebar: Element, except?: HTMLElement): HTMLElement[] {
	return sidebarCards(sidebar).filter((card) => card !== except && card.offsetHeight > 0)
}

function measure(cards: HTMLElement[]): Map<HTMLElement, DOMRect> {
	return new Map(cards.map((card) => [card, card.getBoundingClientRect()]))
}

// Animates each card from where it was measured to where the layout now puts it.
function animateFrom(before: Map<HTMLElement, DOMRect>): void {
	for (const [card, from] of before) {
		card.style.transform = ''
		if (prefersReducedMotion()) continue
		const to = card.getBoundingClientRect()
		const dx = from.left - to.left
		const dy = from.top - to.top
		if (!dx && !dy) continue
		card.style.transition = 'none'
		card.style.transform = `translate(${dx}px, ${dy}px)`
		// Forces a layout so the transition starts from the offset above
		void card.offsetWidth
		card.style.transition = `transform ${SNAP_DURATION}ms ease`
		card.style.transform = ''
		card.addEventListener('transitionend', () => (card.style.transition = ''), { once: true })
	}
}

function moveWithAnimation(sidebar: Element, move: () => void): void {
	const before = measure(visibleCards(sidebar))
	move()
	animateFrom(before)
}

// Takes the card out of the layout so the cards below close the gap it leaves.
function liftCard(card: HTMLElement, sidebar: HTMLElement): () => void {
	const rect = card.getBoundingClientRect()
	const bounds = sidebar.getBoundingClientRect()
	const content = card.firstElementChild instanceof HTMLElement ? card.firstElementChild : null
	const position = card.style.position
	const before = measure(visibleCards(sidebar, card))

	// Its margins would no longer collapse through the wrapper once it is out of the layout
	if (content) content.style.margin = '0'
	Object.assign(card.style, {
		position: 'absolute',
		top: `${rect.top - bounds.top}px`,
		left: `${rect.left - bounds.left}px`,
		width: `${rect.width}px`,
		transition: 'none',
		zIndex: '20',
		filter: 'drop-shadow(0 12px 24px rgb(0 0 0 / 0.35))',
	})
	animateFrom(before)

	return () => {
		if (content) content.style.margin = ''
		Object.assign(card.style, { position, top: '', left: '', width: '', filter: '' })
		// Stays above its neighbours until it has snapped into place
		setTimeout(() => (card.style.zIndex = ''), SNAP_DURATION)
	}
}

// Lives inside the sidebar so the lifted card always stacks above it
function createIndicator(sidebar: HTMLElement): HTMLElement {
	const indicator = document.createElement('div')
	Object.assign(indicator.style, {
		position: 'absolute',
		left: '0',
		right: '0',
		height: `${INDICATOR_HEIGHT}px`,
		borderRadius: '9999px',
		background: 'var(--color-contrast)',
		pointerEvents: 'none',
		display: 'none',
	})
	sidebar.style.position = 'relative'
	sidebar.appendChild(indicator)
	return indicator
}

function dropLineY(previous?: HTMLElement, next?: HTMLElement): number | null {
	const above = previous?.getBoundingClientRect().bottom
	const below = next?.getBoundingClientRect().top
	if (above !== undefined && below !== undefined) return (above + below) / 2
	if (below !== undefined) return below - EDGE_GAP
	if (above !== undefined) return above + EDGE_GAP
	return null
}

// Keyboard alternative to dragging, one visible card at a time.
export function moveCardBy(card: HTMLElement, offset: number): boolean {
	const sidebar = card.parentElement
	if (!sidebar) return false
	const cards = sidebarCards(sidebar).filter((other) => other === card || other.offsetHeight > 0)
	const target = cards[cards.indexOf(card) + offset]
	if (!target) return false
	moveWithAnimation(sidebar, () => (offset < 0 ? target.before(card) : target.after(card)))
	return true
}

// The card follows the pointer while a line marks where it will drop. Escape cancels.
export function startCardDrag(card: HTMLElement, event: PointerEvent, onDrop: () => void): void {
	const parent = card.parentElement
	if (!parent || event.button !== 0) return
	const sidebar: HTMLElement = parent
	event.preventDefault()

	const start = { x: event.clientX, y: event.clientY, scroll: window.scrollY }
	const pointer = { x: event.clientX, y: event.clientY }
	const indicator = createIndicator(sidebar)
	const putDown = liftCard(card, sidebar)
	let dropBefore: HTMLElement | null = null
	let dropAfter: HTMLElement | null = null
	let frame = 0

	document.documentElement.style.cursor = 'grabbing'
	document.documentElement.style.userSelect = 'none'

	function update() {
		const dx = pointer.x - start.x
		const dy = pointer.y - start.y + (window.scrollY - start.scroll)
		card.style.transform = `translate(${dx}px, ${dy}px)`

		const others = visibleCards(sidebar, card)
		const next = others.find((other) => {
			const rect = other.getBoundingClientRect()
			return pointer.y < rect.top + rect.height / 2
		})
		const previous = next ? others[others.indexOf(next) - 1] : others.at(-1)
		dropBefore = next ?? null
		dropAfter = next ? null : (previous ?? null)

		const y = dropLineY(previous, next)
		indicator.style.display = y === null ? 'none' : 'block'
		indicator.style.top = `${(y ?? 0) - sidebar.getBoundingClientRect().top - INDICATOR_HEIGHT / 2}px`
	}

	function tick() {
		if (pointer.y < SCROLL_EDGE) window.scrollBy(0, -SCROLL_SPEED)
		else if (pointer.y > window.innerHeight - SCROLL_EDGE) window.scrollBy(0, SCROLL_SPEED)
		update()
		frame = requestAnimationFrame(tick)
	}

	function onPointerMove(moveEvent: PointerEvent) {
		pointer.x = moveEvent.clientX
		pointer.y = moveEvent.clientY
	}

	function onKeydown(keyEvent: KeyboardEvent) {
		if (keyEvent.key !== 'Escape') return
		// Stops the editor from also closing
		keyEvent.stopImmediatePropagation()
		finish(false)
	}

	function finish(commit: boolean) {
		cancelAnimationFrame(frame)
		window.removeEventListener('pointermove', onPointerMove)
		window.removeEventListener('pointerup', onPointerUp)
		window.removeEventListener('pointercancel', onPointerCancel)
		window.removeEventListener('keydown', onKeydown, true)
		document.documentElement.style.cursor = ''
		document.documentElement.style.userSelect = ''

		const orderBefore = sidebarCards(sidebar)
		moveWithAnimation(sidebar, () => {
			putDown()
			if (!commit) return
			if (dropBefore) dropBefore.before(card)
			else dropAfter?.after(card)
		})
		// The lifted card was positioned against the sidebar, so this waits until it is back
		indicator.remove()
		sidebar.style.position = ''
		const orderAfter = sidebarCards(sidebar)
		if (orderAfter.some((element, index) => element !== orderBefore[index])) onDrop()
	}

	const onPointerUp = () => finish(true)
	const onPointerCancel = () => finish(false)

	window.addEventListener('pointermove', onPointerMove)
	window.addEventListener('pointerup', onPointerUp)
	window.addEventListener('pointercancel', onPointerCancel)
	window.addEventListener('keydown', onKeydown, true)
	frame = requestAnimationFrame(tick)
}
