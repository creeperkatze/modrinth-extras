<template>
	<a
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
	<Teleport v-if="panelTarget" :to="panelTarget" :disabled="!active">
		<div v-show="active" id="modrinth-extras-reviews-panel" class="flex flex-col gap-3">
			<ReviewSkeletons v-if="checking" :count="3" :label="formatMessage(messages.loading)" />

			<div
				v-else-if="!currentSource"
				class="flex flex-col items-center gap-2 rounded-2xl border border-solid border-surface-4 bg-surface-3 px-4 py-8 text-center"
			>
				<MessagesSquareIcon aria-hidden="true" class="size-8 text-secondary" />
				<span class="text-lg font-semibold text-contrast">
					{{ formatMessage(messages.notFoundTitle) }}
				</span>
				<span class="text-base text-secondary">
					{{ formatMessage(messages.notFoundDescription, { sources: enabledSourceNames }) }}
				</span>
			</div>

			<template v-else>
				<Tabs
					v-if="sources.length > 1"
					:value="currentSource"
					:tabs="sourceTabs"
					:aria-label="formatMessage(messages.source)"
					@update:value="source = $event as ReviewSource"
				/>
				<KeepAlive>
					<ModdexReviews v-if="currentSource === 'moddex'" :project-slug="projectSlug" />
					<CurseForgeComments
						v-else-if="currentSource === 'curseforge' && curseforgeProject"
						:project="curseforgeProject"
					/>
					<SpigotReviews
						v-else-if="currentSource === 'spigot' && spigotProject"
						:project="spigotProject"
					/>
				</KeepAlive>
			</template>
		</div>
	</Teleport>
</template>

<script setup lang="ts">
import { MessagesSquareIcon } from '@modrinth/assets'
import { defineMessages, Tabs, type TabsTab, useVIntl } from '@modrinth/ui'
import { type Component, computed, onMounted, onUnmounted, ref, shallowRef } from 'vue'
import { browser } from 'wxt/browser'

import { modrinthClient } from '../../../api/client'
import CurseForgeIcon from '../../../assets/icons/curseforge.svg?component'
import ModdexLogo from '../../../assets/icons/moddex.svg?component'
import SpigotIcon from '../../../assets/icons/spigot.svg?component'
import { i18n } from '../../../core/i18n/i18n'
import { getMatchableProject, type MatchableProject } from '../../../features/platforms/matching'
import CurseForgeComments from './CurseForgeComments.vue'
import ModdexReviews from './ModdexReviews.vue'
import ReviewSkeletons from './ReviewSkeletons.vue'
import SpigotReviews from './SpigotReviews.vue'

type ReviewSource = 'moddex' | 'curseforge' | 'spigot'

const SOURCE_TABS: Record<ReviewSource, { label: string; icon: Component }> = {
	moddex: { label: 'ModDex', icon: ModdexLogo },
	curseforge: { label: 'CurseForge', icon: CurseForgeIcon },
	spigot: { label: 'SpigotMC', icon: SpigotIcon },
}

const { formatMessage } = useVIntl()

const messages = defineMessages({
	tab: { id: 'projectReviews.tab', defaultMessage: 'Reviews' },
	source: { id: 'projectReviews.source', defaultMessage: 'Review source' },
	loading: { id: 'projectReviews.loading', defaultMessage: 'Loading reviews…' },
	notFoundTitle: { id: 'projectReviews.notFoundTitle', defaultMessage: 'No reviews found' },
	notFoundDescription: {
		id: 'projectReviews.notFoundDescription',
		defaultMessage: 'This project has no reviews on {sources}.',
	},
})

const props = defineProps<{
	projectSlug: string
	moddex: boolean
	curseforge: boolean
	spigot: boolean
}>()

const CONTENT_SELECTOR = '.normal-page__content'
const ACTIVE_CONTENT_CLASS = 'modrinth-extras-reviews-active'
const ACTIVE_NAV_CLASS = 'modrinth-extras-reviews-nav-active'

// Kept shallow so the projects can be sent to the background, which can't clone Vue proxies.
const moddexAvailable = ref(false)
const curseforgeProject = shallowRef<MatchableProject | null>(null)
const spigotProject = shallowRef<MatchableProject | null>(null)
const active = ref(false)
const panelTarget = ref<HTMLElement | null>(null)
const source = ref<ReviewSource | null>(null)
// The tab is there from the start, so the panel waits here until every source has been checked.
const checking = ref(true)

const sources = computed(() => {
	const list: ReviewSource[] = []
	if (props.moddex && moddexAvailable.value) list.push('moddex')
	if (props.curseforge && curseforgeProject.value) list.push('curseforge')
	if (props.spigot && spigotProject.value) list.push('spigot')
	return list
})

const currentSource = computed(() => source.value ?? sources.value[0] ?? null)

const enabledSourceNames = computed(() => {
	const enabled = (['moddex', 'curseforge', 'spigot'] as const).filter((value) => props[value])
	return new Intl.ListFormat(i18n.global.locale.value, { type: 'disjunction' }).format(
		enabled.map((value) => SOURCE_TABS[value].label),
	)
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

// A source only gets a tab once the project is found there, and on CurseForge has comments turned on.
async function isAvailable(
	source: ReviewSource,
	lookup: { slug: string } | { project: MatchableProject },
): Promise<boolean> {
	try {
		const available = (await browser.runtime.sendMessage({
			type: 'review-source-available',
			source,
			...lookup,
		})) as boolean | undefined
		return available ?? false
	} catch (err) {
		console.error(`[Modrinth Extras] Failed to look up ${SOURCE_TABS[source].label} reviews:`, err)
		return false
	}
}

async function loadPlatformProjects() {
	try {
		const project = await modrinthClient.labrinth.projects_v3.get(props.projectSlug)
		// SpigotMC only hosts plugins, so other projects would only find unrelated namesakes.
		const spigot = props.spigot && project.project_types.includes('plugin')
		if (!spigot && !props.curseforge) return

		const matchable = await getMatchableProject(project)
		await Promise.all([
			spigot &&
				isAvailable('spigot', { project: matchable }).then((found) => {
					if (found) spigotProject.value = matchable
				}),
			props.curseforge &&
				isAvailable('curseforge', { project: matchable }).then((found) => {
					if (found) curseforgeProject.value = matchable
				}),
		])
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load project for platform reviews:', err)
	}
}

async function checkSources() {
	await Promise.all([
		props.moddex &&
			isAvailable('moddex', { slug: props.projectSlug }).then(
				(found) => (moddexAvailable.value = found),
			),
		(props.spigot || props.curseforge) && loadPlatformProjects(),
	])
	checking.value = false
}

onMounted(() => {
	void checkSources()
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
