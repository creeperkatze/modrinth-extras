<template>
	<div class="flex h-[600px] w-[420px] flex-col">
		<header class="flex shrink-0 items-center gap-2 px-4 py-3.5">
			<a
				href="https://github.com/creeperkatze/modrinth-extras"
				target="_blank"
				rel="noopener"
				class="mr-auto flex shrink-0 items-center no-underline"
			>
				<Logo role="img" aria-label="Modrinth Extras" class="!h-10 !w-auto text-brand" />
			</a>
			<IconButton
				v-tooltip="
					view === 'settings'
						? formatMessage(messages['popup.nav.back'])
						: formatMessage(messages['popup.nav.settings'])
				"
				:label="
					view === 'settings'
						? formatMessage(messages['popup.nav.back'])
						: formatMessage(messages['popup.nav.settings'])
				"
				@click="toggleSettings"
			>
				<LeftArrowIcon v-if="view === 'settings'" aria-hidden="true" />
				<SettingsIcon v-else aria-hidden="true" />
			</IconButton>
			<ButtonLink
				href="https://modrinth.com"
				target="_blank"
				type="colored"
				color="brand"
				class="no-underline"
			>
				Modrinth
				<ArrowUpRightIcon aria-hidden="true" />
			</ButtonLink>
		</header>

		<HorizontalRule class="shrink-0" />

		<template v-if="settingsLoaded">
			<SettingsView v-if="view === 'settings'" />
			<!-- One scroll area, so the banners scroll away and the tabs stick at the top -->
			<div v-else class="flex min-h-0 flex-1 flex-col overflow-hidden" :style="fadeMask">
				<div
					ref="scroller"
					class="min-h-0 flex-1 overflow-y-auto"
					:style="{ '--popup-nav-height': `${navHeight}px` }"
					@scroll="updateFade"
				>
					<div ref="banners" class="flex flex-col gap-2 px-3 [&>*:first-child]:mt-3">
						<DiscordCard />
						<DonateCard />
					</div>
					<div ref="nav" data-sticky-header class="sticky top-0 z-20 bg-bg px-3 py-3">
						<Tabs
							:value="view"
							:tabs="tabs"
							class="!w-full [&>button]:min-w-0 [&>button]:flex-auto [&>button]:px-2 [&_span]:truncate"
							@update:value="selectTab"
						/>
					</div>
					<div ref="content">
						<SearchView v-if="view === 'search'" key="search" />
						<CreatorView v-else key="creator" />
					</div>
				</div>
			</div>
		</template>
		<div v-else class="min-h-0 flex-1" />

		<HorizontalRule class="shrink-0" />

		<PopupFooter />
	</div>
</template>

<script setup lang="ts">
import {
	ArrowUpRightIcon,
	DashboardIcon,
	LeftArrowIcon,
	SearchIcon,
	SettingsIcon,
} from '@modrinth/assets'
import {
	ButtonLink,
	defineMessages,
	HorizontalRule,
	IconButton,
	Tabs,
	useVIntl,
} from '@modrinth/ui'
import { computed, onBeforeUnmount, onMounted, reactive, ref, useTemplateRef, watch } from 'vue'

import { applyAccentColor } from '../../features/accent-color/apply'
import Logo from '../../public/logo.svg?component'
import DiscordCard from './components/DiscordCard.vue'
import DonateCard from './components/DonateCard.vue'
import PopupFooter from './components/PopupFooter.vue'
import { loadAccount } from './state/account'
import { loadPopupSettings, settings, settingsLoaded } from './state/settings'
import CreatorView from './views/CreatorView.vue'
import SearchView from './views/SearchView.vue'
import SettingsView from './views/SettingsView.vue'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'popup.nav.search': { id: 'popup.nav.search', defaultMessage: 'Search' },
	'popup.nav.creator': { id: 'popup.nav.creator', defaultMessage: 'Creator' },
	'popup.nav.settings': { id: 'popup.nav.settings', defaultMessage: 'Settings' },
	'popup.nav.back': { id: 'popup.nav.back', defaultMessage: 'Back' },
})

type MainTab = 'search' | 'creator'
type PopupView = MainTab | 'settings'

const MAIN_TABS: MainTab[] = ['search', 'creator']
const VIEW_STORAGE_KEY = 'popup-view'

const tabs = computed(() => [
	{ value: 'search', label: formatMessage(messages['popup.nav.search']), icon: SearchIcon },
	{ value: 'creator', label: formatMessage(messages['popup.nav.creator']), icon: DashboardIcon },
])

function savedTab(): MainTab {
	try {
		const saved = localStorage.getItem(VIEW_STORAGE_KEY)
		return MAIN_TABS.includes(saved as MainTab) ? (saved as MainTab) : 'search'
	} catch {
		return 'search'
	}
}

// Reopens on the tab that was open last, settings are always one click away
const lastTab = ref<MainTab>(savedTab())
const view = ref<PopupView>(lastTab.value)

watch(lastTab, (value) => {
	try {
		localStorage.setItem(VIEW_STORAGE_KEY, value)
	} catch {
		// Remembering the tab is optional
	}
})

const scroller = useTemplateRef<HTMLElement>('scroller')
const banners = useTemplateRef<HTMLElement>('banners')
const nav = useTemplateRef<HTMLElement>('nav')
const content = useTemplateRef<HTMLElement>('content')
const navHeight = ref(0)

// Same fade as Modrinth's scrollable panels, but starting below whatever is stuck at the top
const FADE_HEIGHT = 48
const fade = reactive({ start: 0, top: false, bottom: false })

function updateFade() {
	const element = scroller.value
	if (!element) return
	const bannersHeight = banners.value?.offsetHeight ?? 0
	fade.bottom = Math.ceil(element.scrollTop + element.clientHeight) < element.scrollHeight

	if (element.scrollTop < bannersHeight) {
		fade.start = 0
		fade.top = element.scrollTop > 0
		return
	}
	const scrollerTop = element.getBoundingClientRect().top
	const headerBottoms = [...element.querySelectorAll('[data-sticky-header]')].map(
		(header) => header.getBoundingClientRect().bottom - scrollerTop,
	)
	fade.start = Math.max(0, ...headerBottoms)
	fade.top = element.scrollTop > bannersHeight
}

const fadeMask = computed(() => {
	const top = fade.top
		? `black ${fade.start}px, transparent ${fade.start}px, black ${fade.start + FADE_HEIGHT}px`
		: 'black 0px'
	const bottom = fade.bottom
		? `black calc(100% - ${FADE_HEIGHT}px), transparent 100%`
		: 'black 100%'
	return { maskImage: `linear-gradient(to bottom, ${top}, ${bottom})` }
})

let layoutObserver: ResizeObserver | undefined

// Views stick their own header right below the tabs, and loading content changes the fade
watch([scroller, nav], ([scrollerElement, navElement]) => {
	layoutObserver?.disconnect()
	if (!scrollerElement || !navElement) return
	layoutObserver = new ResizeObserver(() => {
		navHeight.value = navElement.offsetHeight
		updateFade()
	})
	for (const element of [scrollerElement, navElement, banners.value, content.value]) {
		if (element) layoutObserver.observe(element)
	}
})

onBeforeUnmount(() => layoutObserver?.disconnect())

function selectTab(value: string | number) {
	if (!MAIN_TABS.includes(value as MainTab)) return
	lastTab.value = value as MainTab
	view.value = lastTab.value
	// The new tab starts at its top, without bringing the scrolled away banners back
	if (scroller.value && banners.value) {
		scroller.value.scrollTop = Math.min(scroller.value.scrollTop, banners.value.offsetHeight)
	}
}

function toggleSettings() {
	view.value = view.value === 'settings' ? lastTab.value : 'settings'
}

watch(
	() => settings.accentColor,
	() => applyAccentColor(settings),
	{ deep: true, immediate: true },
)

onMounted(() => {
	void loadPopupSettings()
	void loadAccount()
})
</script>
