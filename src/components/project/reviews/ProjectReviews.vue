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
import { type Component, computed, onMounted, onUnmounted, ref, shallowRef, watch } from 'vue'
import { browser } from 'wxt/browser'

import { modrinthClient } from '../../../api/client'
import CurseForgeIcon from '../../../assets/icons/curseforge.svg?component'
import ModdexLogo from '../../../assets/icons/moddex.svg?component'
import SpigotIcon from '../../../assets/icons/spigot.svg?component'
import { i18n } from '../../../core/i18n/i18n'
import { useSettings } from '../../../core/settings-store'
import { getMatchableProject, type MatchableProject } from '../../../features/platforms/matching'
import CurseForgeComments from './CurseForgeComments.vue'
import ModdexReviews from './ModdexReviews.vue'
import ReviewSkeletons from './ReviewSkeletons.vue'
import SpigotReviews from './SpigotReviews.vue'

type ReviewSource = 'moddex' | 'curseforge' | 'spigot'

const SOURCES: ReviewSource[] = ['moddex', 'curseforge', 'spigot']

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

const props = defineProps<{ projectSlug: string }>()

const settings = useSettings()
const enabledSources = computed(() => SOURCES.filter((value) => settings.reviews[value]))

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
const pendingChecks = ref(0)
const checking = computed(() => pendingChecks.value > 0)

const found: Record<ReviewSource, () => boolean> = {
	moddex: () => moddexAvailable.value,
	curseforge: () => !!curseforgeProject.value,
	spigot: () => !!spigotProject.value,
}

const sources = computed(() => enabledSources.value.filter((value) => found[value]()))

// The picked source can be turned off in the popup while it is open
const currentSource = computed(() =>
	source.value && sources.value.includes(source.value) ? source.value : (sources.value[0] ?? null),
)

const enabledSourceNames = computed(() => {
	return new Intl.ListFormat(i18n.global.locale.value, { type: 'disjunction' }).format(
		enabledSources.value.map((value) => SOURCE_TABS[value].label),
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

// Shared by CurseForge and SpigotMC, so the project is only fetched once
let platformProject: Promise<{ plugin: boolean; matchable: MatchableProject }> | null = null

function loadPlatformProject() {
	platformProject ??= modrinthClient.labrinth.projects_v3
		.get(props.projectSlug)
		.then(async (project) => ({
			plugin: project.project_types.includes('plugin'),
			matchable: await getMatchableProject(project),
		}))
	return platformProject
}

async function lookUpPlatform(source: 'curseforge' | 'spigot') {
	try {
		const { plugin, matchable } = await loadPlatformProject()
		// SpigotMC only hosts plugins, so other projects would only find unrelated namesakes.
		if (source === 'spigot' && !plugin) return
		if (!(await isAvailable(source, { project: matchable }))) return
		if (source === 'spigot') spigotProject.value = matchable
		else curseforgeProject.value = matchable
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load project for platform reviews:', err)
	}
}

async function checkSource(source: ReviewSource) {
	pendingChecks.value++
	if (source === 'moddex')
		moddexAvailable.value = await isAvailable('moddex', { slug: props.projectSlug })
	else await lookUpPlatform(source)
	pendingChecks.value--
}

// A source turned on in the popup later is checked then
const checked = new Set<ReviewSource>()
watch(
	enabledSources,
	(enabled) => {
		for (const source of enabled) {
			if (checked.has(source)) continue
			checked.add(source)
			void checkSource(source)
		}
	},
	{ immediate: true },
)

onMounted(() => {
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
