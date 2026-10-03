<template>
	<a
		v-if="sources.length"
		ref="tabEl"
		href="#reviews"
		role="tab"
		:aria-selected="active"
		class="button-animation z-[1] flex flex-row items-center gap-2 px-4 py-2 no-underline focus:rounded-full"
		:class="active ? 'text-button-textSelected' : 'text-contrast'"
		@click.prevent="activate"
	>
		<span class="text-nowrap">{{ formatMessage(messages.tab) }}</span>
	</a>

	<!-- Disabling the teleport instead of unmounting keeps loaded reviews when switching tabs. -->
	<Teleport v-if="source && panelTarget" :to="panelTarget" :disabled="!active">
		<div v-show="active" id="modrinth-extras-reviews-panel" class="flex flex-col gap-3">
			<Tabs
				v-if="sources.length > 1"
				:value="source"
				:tabs="sourceTabs"
				:aria-label="formatMessage(messages.source)"
				@update:value="source = $event as ReviewSource"
			/>
			<KeepAlive>
				<ModdexReviews
					v-if="source === 'moddex'"
					:project-slug="projectSlug"
					:is-modpack="isModpack"
				/>
				<SpigotReviews v-else-if="source === 'spigot' && spigotProject" :project="spigotProject" />
			</KeepAlive>
		</div>
	</Teleport>
</template>

<script setup lang="ts">
import { defineMessages, Tabs, type TabsTab, useVIntl } from '@modrinth/ui'
import { type Component, computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'

import ModdexLogo from '../../../assets/icons/moddex.svg?component'
import SpigotIcon from '../../../assets/icons/spigot.svg?component'
import { modrinthClient } from '../../../utils/api'
import { getMatchableProject, type MatchableProject } from '../../../utils/platforms'
import ModdexReviews from './ModdexReviews.vue'
import SpigotReviews from './SpigotReviews.vue'

type ReviewSource = 'moddex' | 'spigot'

const SOURCE_TABS: Record<ReviewSource, { label: string; icon: Component }> = {
	moddex: { label: 'ModDex', icon: ModdexLogo },
	spigot: { label: 'SpigotMC', icon: SpigotIcon },
}

const { formatMessage } = useVIntl()

const messages = defineMessages({
	tab: { id: 'projectReviews.tab', defaultMessage: 'Reviews' },
	source: { id: 'projectReviews.source', defaultMessage: 'Review source' },
})

const props = defineProps<{
	projectSlug: string
	isModpack: boolean
	moddex: boolean
	spigot: boolean
}>()

const CONTENT_SELECTOR = '.normal-page__content'
const ACTIVE_CONTENT_CLASS = 'modrinth-extras-reviews-active'
const ACTIVE_NAV_CLASS = 'modrinth-extras-reviews-nav-active'

// Kept shallow so the project can be sent to the background, which can't clone Vue proxies.
const spigotProject = shallowRef<MatchableProject | null>(null)
const active = ref(false)
const panelTarget = ref<HTMLElement | null>(null)
const source = ref<ReviewSource | null>(null)

const sources = computed(() => {
	const list: ReviewSource[] = []
	if (props.moddex) list.push('moddex')
	if (props.spigot && spigotProject.value) list.push('spigot')
	return list
})

const sourceTabs = computed<TabsTab[]>(() =>
	sources.value.map((value) => ({ value, ...SOURCE_TABS[value] })),
)

function getNav(): HTMLElement | null {
	return document.querySelector<HTMLElement>(`${CONTENT_SELECTOR} > div > nav`)
}

const tabEl = ref<HTMLElement | null>(null)
let savedSliderStyle: string | null = null
let resizeObserver: ResizeObserver | undefined

function getSlider(): HTMLElement | null {
	return getNav()?.querySelector<HTMLElement>(':scope > .pointer-events-none.absolute') ?? null
}

// NavTabs only knows its own links, so the highlight is moved under this tab by hand.
function moveSliderToTab() {
	const nav = getNav()
	const slider = getSlider()
	const tab = tabEl.value
	if (!nav || !slider || !tab) return
	slider.style.left = `${tab.offsetLeft}px`
	slider.style.top = `${tab.offsetTop}px`
	slider.style.right = `${nav.clientWidth - tab.offsetLeft - tab.offsetWidth}px`
	slider.style.bottom = `${nav.clientHeight - tab.offsetTop - tab.offsetHeight}px`
}

// Vue only patches changed style values, so the original must be put back before it navigates.
function restoreSlider() {
	const slider = getSlider()
	if (slider && savedSliderStyle !== null) slider.style.cssText = savedSliderStyle
	savedSliderStyle = null
}

function setActive(value: boolean) {
	active.value = value
	if (value) panelTarget.value = document.querySelector<HTMLElement>(CONTENT_SELECTOR)
	document.querySelector(CONTENT_SELECTOR)?.classList.toggle(ACTIVE_CONTENT_CLASS, value)
	const nav = getNav()
	nav?.classList.toggle(ACTIVE_NAV_CLASS, value)

	resizeObserver?.disconnect()
	if (value) {
		const slider = getSlider()
		if (slider && savedSliderStyle === null) savedSliderStyle = slider.style.cssText
		moveSliderToTab()
		if (nav) {
			resizeObserver = new ResizeObserver(moveSliderToTab)
			resizeObserver.observe(nav)
		}
	} else {
		restoreSlider()
	}
}

function activate() {
	source.value ??= sources.value[0] ?? null
	setActive(true)
}

function deactivate() {
	if (active.value) setActive(false)
}

// Clicking a native tab, even the current one, must hand the page back to Modrinth.
function onNavClick(event: MouseEvent) {
	const link = (event.target as HTMLElement).closest('a')
	if (link && link.getAttribute('href') !== '#reviews' && link.closest('nav') === getNav()) {
		deactivate()
	}
}

// SpigotMC only hosts plugins, so other projects would only find unrelated namesakes.
async function loadSpigotProject() {
	try {
		const project = await modrinthClient.labrinth.projects_v3.get(props.projectSlug)
		if (project.project_types.includes('plugin')) {
			spigotProject.value = await getMatchableProject(project)
		}
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load project for SpigotMC reviews:', err)
	}
}

onMounted(() => {
	if (props.spigot) void loadSpigotProject()
	document.addEventListener('click', onNavClick, true)
	window.addEventListener('modrinth-extras:before-navigate', deactivate)
})

onUnmounted(() => {
	document.removeEventListener('click', onNavClick, true)
	window.removeEventListener('modrinth-extras:before-navigate', deactivate)
	resizeObserver?.disconnect()
	setActive(false)
})
</script>

<style>
.modrinth-extras-reviews-active > :not(:first-child):not(#modrinth-extras-reviews-panel) {
	display: none !important;
}

.modrinth-extras-reviews-nav-active .tab-color {
	color: var(--color-contrast) !important;
}
</style>
