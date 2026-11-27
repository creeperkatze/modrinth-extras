// Undoes our changes to a card, kept after unmounting in case the card is reused
const restorers = new WeakMap<HTMLElement, () => void>()

// Our actions take space from the tags row, so tags that no longer fit get folded into the +N badge.
// The returned release puts the tags back unless the card is about to go away anyway.
export function fitCardTags(card: HTMLElement): (restore: boolean) => void {
	// A card kept across a navigation still has its tags folded from before
	restorers.get(card)?.()
	restorers.delete(card)

	const area = card.querySelector<HTMLElement>('.grid-project-card-list__tags')
	const list = area?.querySelector<HTMLElement>(':scope > div > div.gap-1')
	if (!area || !list) return () => {}

	const tags = [...list.children] as HTMLElement[]
	const badge = tags.pop()?.firstElementChild
	// Vue holds this text node, so it's updated in place rather than replaced
	const badgeText = [...(badge?.childNodes ?? [])].find(
		(node): node is Text => node.nodeType === Node.TEXT_NODE && /\+\d+/.test(node.nodeValue ?? ''),
	)
	const originalBadgeText = badgeText?.nodeValue ?? ''
	const baseCount = Number(originalBadgeText.trim().slice(1))
	let addedBadge: HTMLElement | null = null

	function setOverflowCount(count: number) {
		if (badgeText) {
			badgeText.nodeValue = count > baseCount ? ` +${count} ` : originalBadgeText
		} else if (count === 0) {
			addedBadge?.remove()
			addedBadge = null
		} else {
			if (!addedBadge) {
				addedBadge = tags[0]!.cloneNode(false) as HTMLElement
				addedBadge.removeAttribute('style')
				list!.appendChild(addedBadge)
			}
			addedBadge.textContent = `+${count}`
		}
	}

	function showAll() {
		for (const tag of tags) tag.style.display = ''
		setOverflowCount(baseCount)
	}

	const observer = new ResizeObserver(() => {
		showAll()
		const limit = area.getBoundingClientRect().right
		let hidden = 0
		while (hidden < tags.length && list.getBoundingClientRect().right > limit) {
			tags[tags.length - ++hidden]!.style.display = 'none'
			setOverflowCount(baseCount + hidden)
		}
	})
	area.style.minWidth = '0'
	observer.observe(area)

	function restore() {
		observer.disconnect()
		showAll()
		area!.style.minWidth = ''
	}
	restorers.set(card, restore)

	return (shouldRestore) => {
		observer.disconnect()
		if (!shouldRestore) return
		restore()
		restorers.delete(card)
	}
}
