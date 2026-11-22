import { storage } from '@wxt-dev/storage'
import { reactive } from 'vue'
import { browser } from 'wxt/browser'

export interface SyncedListState<T> {
	selected: string
	items: T[]
}

interface Index {
	selected: string
	ids: string[]
}

function indexOf(state: SyncedListState<{ id: string }>): Index {
	return { selected: state.selected, ids: state.items.map((item) => item.id) }
}

// Each item is its own sync item to stay under 8 KB per item
export function defineSyncedList<T extends { id: string }>(name: string) {
	const indexKey = `sync:${name}` as const
	const itemKey = (id: string) => `sync:${name}:${id}` as const

	const state = reactive({ selected: '', items: [] }) as SyncedListState<T>
	let saved: SyncedListState<T> = { selected: '', items: [] }
	let loading: Promise<void> | null = null
	let reloads = 0

	async function read(): Promise<SyncedListState<T>> {
		const index = await storage.getItem<Index>(indexKey)
		if (!index) return { selected: '', items: [] }
		const found = await storage.getItems(index.ids.map(itemKey))
		const items = found.map(({ value }) => value as T | null).filter((item) => item !== null)
		return { selected: index.selected, items }
	}

	function apply(next: SyncedListState<T>) {
		saved = next
		state.selected = next.selected
		// A copy, so editing it in place can't change what was saved
		if (JSON.stringify(state.items) !== JSON.stringify(next.items)) {
			state.items = structuredClone(next.items)
		}
	}

	// Our own writes come back as changes too, and are skipped
	async function reload() {
		const reload = ++reloads
		const next = await read()
		if (reload !== reloads || JSON.stringify(next) === JSON.stringify(saved)) return
		apply(next)
	}

	function load(): Promise<void> {
		loading ??= (async () => {
			apply(await read())
			browser.storage.onChanged.addListener((changes, area) => {
				if (area !== 'sync') return
				const keys = Object.keys(changes)
				if (keys.some((key) => key === name || key.startsWith(`${name}:`))) void reload()
			})
		})()
		return loading
	}

	async function save() {
		await load()
		// Firefox can't structured clone Vue's reactive proxies
		const next = JSON.parse(JSON.stringify(state)) as SyncedListState<T>
		const before = new Map(saved.items.map((item) => [item.id, JSON.stringify(item)]))
		const set: { key: `sync:${string}`; value: unknown }[] = []
		for (const item of next.items) {
			if (before.get(item.id) !== JSON.stringify(item))
				set.push({ key: itemKey(item.id), value: item })
			before.delete(item.id)
		}
		const index = indexOf(next)
		if (JSON.stringify(index) !== JSON.stringify(indexOf(saved))) {
			set.push({ key: indexKey, value: index })
		}
		saved = next
		if (set.length) await storage.setItems(set)
		if (before.size) await storage.removeItems([...before.keys()].map(itemKey))
	}

	async function clear() {
		await load()
		const keys = [indexKey, ...saved.items.map((item) => itemKey(item.id))]
		apply({ selected: '', items: [] })
		await storage.removeItems(keys)
	}

	return { state, load, save, clear }
}
