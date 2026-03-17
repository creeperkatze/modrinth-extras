<template>
	<Transition name="quick-search-overlay">
		<div
			v-if="open"
			class="fixed z-[99999] flex items-start justify-center pt-[28vh]"
			style="
				inset: -5rem;
				border-radius: 180px;
				background: linear-gradient(180deg, #1d302b85 0%, #0e151af2 100%);
				backdrop-filter: blur(5px);
			"
			@mousedown.self="close"
		>
			<div
				class="qs-panel w-[min(760px,calc(100vw-32px))] overflow-hidden rounded-2xl p-4 border border-solid border-surface-4 bg-surface-3 shadow-[var(--shadow-raised),var(--shadow-inset)]"
			>
				<div
					class="flex min-h-[52px] cursor-text flex-wrap items-center gap-2 rounded-xl border-2 border-solid border-surface-4 bg-surface-4 px-2 py-2.5 focus-within:border-brand"
					@click="inputEl?.focus()"
				>
					<div
						v-for="tag in tags"
						:key="`${tag.facet}:${tag.value}`"
						class="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-solid border-highlight bg-highlight px-3 py-2 text-[13px] font-semibold text-brand"
					>
						<component :is="FACET_ICONS[tag.facet]" aria-hidden="true" class="size-4 shrink-0" />
						<span>{{ tag.value }}</span>
						<button
							class="flex cursor-pointer items-center rounded-full border-0 bg-transparent p-0 text-brand hover:brightness-75"
							@click.stop="removeTag(tag.facet, tag.value)"
						>
							<XIcon class="size-3.5" />
						</button>
					</div>
					<input
						ref="inputEl"
						v-model="query"
						:placeholder="activePlaceholder"
						class="min-w-[80px] flex-1 caret-brand !border-0 !bg-transparent p-0 text-base font-semibold text-primary !shadow-none !outline-none focus:!border-0 focus:!ring-0 focus:!shadow-none [font-family:inherit]"
						@keydown="onKeydown"
					/>
				</div>

				<ul v-if="suggestions.length" class="m-0 p-0 list-none mt-4">
					<li
						v-for="(s, i) in suggestions"
						:key="s.id"
						:ref="(el) => (suggestionEls[i] = el as HTMLElement | null)"
						:class="[
							'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-semibold text-primary',
							i === selectedIndex ? 'bg-surface-4' : 'hover:bg-surface-4',
						]"
						@click="selectSuggestion(s)"
						@mouseenter="selectedIndex = i"
					>
						<component :is="s.icon" aria-hidden="true" class="size-5 shrink-0 text-secondary" />
						<span class="min-w-0 flex-1">
							<template v-if="s.matchStart !== undefined"
								>{{ s.label.slice(0, s.matchStart)
								}}<span class="font-semibold text-brand">{{
									s.label.slice(s.matchStart, s.matchEnd)
								}}</span
								>{{ s.label.slice(s.matchEnd) }}</template
							><template v-else>{{ s.label }}</template>
						</span>
						<kbd
							:class="[
								'shrink-0 rounded-md border-2 border-solid border-surface-5 bg-transparent px-2.5 py-1 text-[13px] text-secondary',
								i !== selectedIndex && 'invisible',
							]"
							>↵</kbd
						>
					</li>
				</ul>

				<div v-else-if="!query && !tags.length">
					<p class="px-2 pt-1 py-0 text-xs font-bold uppercase tracking-wide text-secondary">Examples</p>
					<div
						v-for="(ex, i) in EXAMPLES"
						:key="ex.label"
						:class="[
							'flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5',
							i === selectedIndex ? 'bg-surface-4' : 'hover:bg-surface-4',
						]"
						@click="applyExample(ex)"
						@mouseenter="selectedIndex = i"
					>
						<SearchIcon aria-hidden="true" class="size-5 shrink-0 text-secondary" />
						<span class="text-[15px] font-semibold text-secondary">{{ ex.label }}</span>
						<div class="ml-auto flex flex-wrap justify-end gap-1.5">
							<span
								v-for="t in ex.tags"
								:key="`${t.facet}:${t.value}`"
								class="inline-flex items-center gap-1.5 rounded-full border border-solid border-highlight bg-highlight px-3 py-2 text-[13px] font-semibold text-brand"
								><component :is="FACET_ICONS[t.facet]" aria-hidden="true" class="size-4 shrink-0" />
								{{ t.value }}
							</span>
						</div>
					</div>
				</div>

				<div v-else-if="tags.length" class="mt-4">
					<div
						class="flex cursor-pointer items-center gap-3 rounded-xl bg-surface-4 px-3 py-2.5 text-[15px] font-semibold text-primary"
						@click="executeSearch"
					>
						<SearchIcon aria-hidden="true" class="size-5 shrink-0 text-secondary" />
						<span class="flex-1">Search</span>
						<kbd
							class="shrink-0 rounded-md border-2 border-solid border-surface-5 bg-transparent px-2.5 py-1 text-[13px] text-secondary"
							>↵</kbd
						>
					</div>
				</div>
			</div>
		</div>
	</Transition>
</template>

<script setup lang="ts">
import { CpuIcon, HashIcon, PackageIcon, SearchIcon, TagIcon, XIcon } from '@modrinth/assets'
import { type Component, computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'

import { useBaseFetch } from '../composables/useBaseFetch'
import { navigate } from '../helpers/page-router'

const FACET_ICONS: Record<string, Component> = {
	loader: CpuIcon,
	category: TagIcon,
	version: HashIcon,
	type: PackageIcon,
}

interface Tag {
	facet: string
	value: string
}

interface Suggestion {
	id: string
	icon: Component
	label: string
	facet?: string
	value?: string
	action: 'add-tag' | 'search'
	matchStart?: number
	matchEnd?: number
	facetMatchEnd?: number
}

interface Example {
	label: string
	tags: Tag[]
}

const TYPES = ['mod', 'plugin', 'datapack', 'shader', 'resourcepack', 'modpack', 'server']

const loaders = ref<string[]>([])
const categories = ref<string[]>([])
const gCategories = ref<Set<string>>(new Set())
const serverCategories = ref<string[]>([])
const versions = ref<string[]>([])

const EXAMPLES: Example[] = [
	{
		label: 'fabric optimization mod',
		tags: [
			{ facet: 'loader', value: 'fabric' },
			{ facet: 'category', value: 'optimization' },
			{ facet: 'type', value: 'mod' },
		],
	},
	{
		label: 'forge technology',
		tags: [
			{ facet: 'loader', value: 'forge' },
			{ facet: 'category', value: 'technology' },
		],
	},
	{
		label: '1.21.4 shader',
		tags: [
			{ facet: 'version', value: '1.21.4' },
			{ facet: 'type', value: 'shader' },
		],
	},
	{
		label: 'neoforge library',
		tags: [
			{ facet: 'loader', value: 'neoforge' },
			{ facet: 'category', value: 'library' },
		],
	},
	{
		label: 'datapack food',
		tags: [
			{ facet: 'type', value: 'datapack' },
			{ facet: 'category', value: 'food' },
		],
	},
	{
		label: 'skyblock server 1.8.9',
		tags: [
			{ facet: 'category', value: 'skyblock' },
			{ facet: 'type', value: 'server' },
			{ facet: 'version', value: '1.8.9' },
		],
	},
]

const PLACEHOLDER_EXAMPLES = EXAMPLES.map((e) => e.label)

const TYPE_PATH: Record<string, string> = {
	mod: '/discover/mods',
	plugin: '/discover/plugins',
	datapack: '/discover/datapacks',
	shader: '/discover/shaders',
	resourcepack: '/discover/resourcepacks',
	modpack: '/discover/modpacks',
	server: '/discover/servers',
}

const open = ref(false)
const query = ref('')
const tags = ref<Tag[]>([])
const selectedIndex = ref(0)
const inputEl = ref<HTMLInputElement | null>(null)
const suggestionEls = ref<(HTMLElement | null)[]>([])

// --- Placeholder animation ---
const animatedText = ref('')
let animTimer: ReturnType<typeof setTimeout> | null = null

function stopAnimation() {
	if (animTimer) clearTimeout(animTimer)
	animTimer = null
	animatedText.value = ''
}

function startAnimation(immediate = false) {
	let exIdx = 0
	let charIdx = 0
	let deleting = false

	function tick() {
		if (!open.value || query.value || tags.value.length) {
			animatedText.value = ''
			return
		}
		const target = PLACEHOLDER_EXAMPLES[exIdx]
		if (!deleting) {
			charIdx++
			animatedText.value = target.slice(0, charIdx)
			if (charIdx === target.length) {
				deleting = true
				animTimer = setTimeout(tick, 1400)
			} else {
				animTimer = setTimeout(tick, 75)
			}
		} else {
			charIdx--
			animatedText.value = target.slice(0, charIdx)
			if (charIdx === 0) {
				deleting = false
				exIdx = (exIdx + 1) % PLACEHOLDER_EXAMPLES.length
				animTimer = setTimeout(tick, 350)
			} else {
				animTimer = setTimeout(tick, 38)
			}
		}
	}

	if (immediate) tick()
	else animTimer = setTimeout(tick, 500)
}

const activePlaceholder = computed(() => {
	if (tags.value.length) return ''
	return animatedText.value
})

watch(open, (val) => {
	if (val) startAnimation(true)
	else stopAnimation()
})

watch(
	[query, tags],
	() => {
		if (query.value || tags.value.length) {
			stopAnimation()
		} else if (open.value) {
			stopAnimation()
			startAnimation(true)
		}
	},
	{ deep: true },
)

function hasTag(facet: string, value: string) {
	return tags.value.some((t) => t.facet === facet && t.value === value)
}

function hasFacet(facet: string) {
	return tags.value.some((t) => t.facet === facet)
}

function matchPos(label: string, q: string): { matchStart: number; matchEnd: number } | undefined {
	if (!q) return undefined
	const idx = label.toLowerCase().indexOf(q.toLowerCase())
	if (idx === -1) return undefined
	return { matchStart: idx, matchEnd: idx + q.length }
}

function facetMatch(facet: string, q: string): { facetMatchEnd: number } | undefined {
	if (!q || !facet.toLowerCase().startsWith(q.toLowerCase())) return undefined
	return { facetMatchEnd: q.length }
}

const isServerMode = computed(() => {
	if (tags.value.some((t) => t.facet === 'type' && t.value === 'server')) return true
	const serverCatSet = new Set(serverCategories.value)
	return tags.value.some((t) => t.facet === 'category' && serverCatSet.has(t.value))
})

const isNonServerMode = computed(() => {
	if (tags.value.some((t) => t.facet === 'type' && t.value !== 'server')) return true
	return tags.value.some((t) => t.facet === 'loader')
})

const suggestions = computed<Suggestion[]>(() => {
	const q = query.value.trim().toLowerCase()
	const results: Suggestion[] = []

	if (q) {
		if (!hasFacet('type')) {
			const validTypes = isServerMode.value
				? ['server']
				: isNonServerMode.value
					? TYPES.filter((t) => t !== 'server')
					: TYPES
			for (const t of validTypes) {
				if (t.includes(q)) {
					results.push({
						id: `type:${t}`,
						icon: PackageIcon,
						label: t,
						facet: 'type',
						value: t,
						action: 'add-tag',
						...matchPos(t, q),
						...facetMatch('type', q),
					})
				}
			}
		}

		if (!isServerMode.value) {
			for (const l of loaders.value) {
				if (l.includes(q) && !hasTag('loader', l)) {
					results.push({
						id: `loader:${l}`,
						icon: CpuIcon,
						label: l,
						facet: 'loader',
						value: l,
						action: 'add-tag',
						...matchPos(l, q),
						...facetMatch('loader', q),
					})
				}
			}
		}

		if (!isServerMode.value) {
			for (const c of categories.value) {
				if (c.includes(q) && !hasTag('category', c)) {
					results.push({
						id: `category:${c}`,
						icon: TagIcon,
						label: c,
						facet: 'category',
						value: c,
						action: 'add-tag',
						...matchPos(c, q),
						...facetMatch('category', q),
					})
				}
			}
		}

		if (!isNonServerMode.value) {
			for (const c of serverCategories.value) {
				if (c.includes(q) && !hasTag('category', c)) {
					results.push({
						id: `server-category:${c}`,
						icon: TagIcon,
						label: c,
						facet: 'category',
						value: c,
						action: 'add-tag',
						...matchPos(c, q),
						...facetMatch('category', q),
					})
				}
			}
		}

		for (const v of versions.value) {
			if (v.startsWith(q) && !hasTag('version', v)) {
				results.push({
					id: `version:${v}`,
					icon: HashIcon,
					label: v,
					facet: 'version',
					value: v,
					action: 'add-tag',
					...matchPos(v, q),
					...facetMatch('version', q),
				})
			}
		}

		results.push({ id: 'search', icon: SearchIcon, label: query.value, action: 'search' })
	}

	return results.slice(0, 8)
})

watch(query, () => {
	selectedIndex.value = 0
})

function openModal() {
	open.value = true
	nextTick(() => inputEl.value?.focus())
}

function close() {
	open.value = false
	query.value = ''
	tags.value = []
	selectedIndex.value = 0
}

function removeTag(facet: string, value: string) {
	tags.value = tags.value.filter((t) => !(t.facet === facet && t.value === value))
	inputEl.value?.focus()
}

function applyExample(ex: Example) {
	tags.value = [...ex.tags]
	query.value = ''
	nextTick(() => inputEl.value?.focus())
}

function selectSuggestion(s: Suggestion) {
	if (s.action === 'add-tag' && s.facet && s.value) {
		tags.value.push({ facet: s.facet, value: s.value })
		query.value = ''
		nextTick(() => inputEl.value?.focus())
	} else if (s.action === 'search') {
		executeSearch()
	}
}

function executeSearch() {
	const typeTag = tags.value.find((t) => t.facet === 'type')
	const categoryTags = tags.value.filter((t) => t.facet === 'category')
	const versionTags = tags.value.filter((t) => t.facet === 'version')
	const basePath = isServerMode.value
		? '/discover/servers'
		: typeTag
			? (TYPE_PATH[typeTag.value] ?? '/discover/mods')
			: '/discover/mods'
	const params = new URLSearchParams()
	if (query.value.trim()) params.set('q', query.value.trim())

	if (isServerMode.value) {
		for (const t of categoryTags) params.append('sc', t.value)
		for (const t of versionTags) params.append('sgv', t.value)
	} else {
		for (const t of tags.value.filter((t) => t.facet === 'loader'))
			params.append('g', `categories:${t.value}`)
		for (const t of categoryTags)
			params.append(gCategories.value.has(t.value) ? 'g' : 'f', `categories:${t.value}`)
		for (const t of versionTags) params.append('v', t.value)
	}

	const qs = params.toString().replaceAll('%3A', ':')
	navigate(`https://modrinth.com${basePath}${qs ? '?' + qs : ''}`)
	close()
}

function onKeydown(e: KeyboardEvent) {
	const inExamples = !query.value && !tags.value.length && !suggestions.value.length
	const listLength = inExamples ? EXAMPLES.length : suggestions.value.length

	if (e.key === 'Escape') {
		close()
	} else if (e.key === 'ArrowDown' || (e.key === 'Tab' && !e.shiftKey)) {
		e.preventDefault()
		selectedIndex.value = Math.min(selectedIndex.value + 1, listLength - 1)
		if (!inExamples) suggestionEls.value[selectedIndex.value]?.scrollIntoView({ block: 'nearest' })
	} else if (e.key === 'ArrowUp' || (e.key === 'Tab' && e.shiftKey)) {
		e.preventDefault()
		selectedIndex.value = Math.max(selectedIndex.value - 1, 0)
		if (!inExamples) suggestionEls.value[selectedIndex.value]?.scrollIntoView({ block: 'nearest' })
	} else if (e.key === 'Enter') {
		e.preventDefault()
		if (inExamples) {
			applyExample(EXAMPLES[selectedIndex.value])
		} else if (suggestions.value.length > 0) {
			selectSuggestion(suggestions.value[selectedIndex.value])
		} else {
			executeSearch()
		}
	} else if (e.key === 'Backspace' && !query.value && tags.value.length) {
		tags.value.pop()
	}
}

function onGlobalKeydown(e: KeyboardEvent) {
	if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
		e.preventDefault()
		if (open.value) close()
		else openModal()
		return
	}
	if (e.key === '/' && !open.value) {
		const target = e.target as HTMLElement
		const tag = target.tagName.toLowerCase()
		if (tag !== 'input' && tag !== 'textarea' && !target.isContentEditable) {
			e.preventDefault()
			openModal()
		}
	}
}

onMounted(async () => {
	window.addEventListener('keydown', onGlobalKeydown)

	try {
		const [loadersRes, categoriesRes, versionsRes] = await Promise.all([
			useBaseFetch('tag/loader') as Promise<{ name: string }[]>,
			useBaseFetch('tag/category') as Promise<
				{ name: string; project_type: string; header: string }[]
			>,
			useBaseFetch('tag/game_version') as Promise<{ version: string }[]>,
		])
		loaders.value = loadersRes.map((l) => l.name)
		const allCats = categoriesRes.filter((c) => c.project_type !== 'minecraft_java_server')
		categories.value = [...new Set(allCats.map((c) => c.name))]
		gCategories.value = new Set(
			allCats
				.filter((c) => c.header === 'resolutions' || c.header === 'loaders')
				.map((c) => c.name),
		)
		serverCategories.value = categoriesRes
			.filter((c) => c.project_type === 'minecraft_java_server')
			.map((c) => c.name)
		versions.value = versionsRes.map((v) => v.version)
	} catch {
		// silently ignore, suggestions simply won't appear
	}
})

onUnmounted(() => {
	window.removeEventListener('keydown', onGlobalKeydown)
	stopAnimation()
})
</script>

<style scoped>
.quick-search-overlay-enter-active,
.quick-search-overlay-leave-active {
	transition: opacity 0.2s ease;
}
.quick-search-overlay-enter-from,
.quick-search-overlay-leave-to {
	opacity: 0;
}
.quick-search-overlay-enter-active .qs-panel,
.quick-search-overlay-leave-active .qs-panel {
	transition:
		transform 0.2s ease,
		opacity 0.2s ease;
}
.quick-search-overlay-enter-from .qs-panel,
.quick-search-overlay-leave-to .qs-panel {
	transform: scale(0.96) translateY(-8px);
	opacity: 0;
}
</style>
