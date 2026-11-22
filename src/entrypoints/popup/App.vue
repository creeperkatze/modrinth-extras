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
				ref="settingsButton"
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
			<template v-else>
				<div class="flex shrink-0 flex-col gap-2 px-3 pt-3 empty:hidden">
					<DiscordCard />
					<DonateCard />
				</div>
				<div ref="tabBar" class="shrink-0 p-3">
					<Tabs
						:value="view"
						:tabs="tabs"
						class="!w-full [&>button]:min-w-0 [&>button]:flex-auto [&>button]:px-2 [&_span]:truncate"
						@update:value="selectTab"
					/>
				</div>
				<div
					ref="scroller"
					class="min-h-0 flex-1 overflow-y-auto"
					:style="fadeMask"
					@scroll="updateFade"
				>
					<div ref="content">
						<SearchView v-if="view === 'search'" key="search" />
						<NotificationsView v-else-if="view === 'notifications'" key="notifications" />
						<CreatorView v-else key="creator" />
					</div>
				</div>
			</template>
		</template>
		<div v-else class="min-h-0 flex-1" />

		<HorizontalRule class="shrink-0" />

		<PopupFooter />

		<IntroductionTour
			:active="settingsLoaded && view !== 'settings'"
			:resolve-target="introductionTourTarget"
		/>
	</div>
</template>

<script setup lang="ts">
import {
	ArrowUpRightIcon,
	BellIcon,
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
import { themeLibrary } from '../../features/themes/library'
import { applyThemeSettings } from '../../features/themes/themes'
import Logo from '../../public/logo.svg?component'
import DiscordCard from './components/DiscordCard.vue'
import DonateCard from './components/DonateCard.vue'
import IntroductionTour, { type IntroductionTourTarget } from './components/IntroductionTour.vue'
import PopupFooter from './components/PopupFooter.vue'
import { loadAccount } from './state/account'
import { loadPopupSettings, settings, settingsLoaded } from './state/settings'
import CreatorView from './views/CreatorView.vue'
import NotificationsView from './views/NotificationsView.vue'
import SearchView from './views/SearchView.vue'
import SettingsView from './views/SettingsView.vue'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'popup.nav.search': { id: 'popup.nav.search', defaultMessage: 'Search' },
	'popup.nav.notifications': {
		id: 'popup.nav.notifications',
		defaultMessage: 'Notifications',
	},
	'popup.nav.creator': { id: 'popup.nav.creator', defaultMessage: 'Creator' },
	'popup.nav.settings': { id: 'popup.nav.settings', defaultMessage: 'Settings' },
	'popup.nav.back': { id: 'popup.nav.back', defaultMessage: 'Back' },
})

type MainTab = 'search' | 'notifications' | 'creator'
type PopupView = MainTab | 'settings'

const MAIN_TABS: MainTab[] = ['search', 'notifications', 'creator']
const VIEW_STORAGE_KEY = 'popup-view'

const tabs = computed(() => [
	{ value: 'search', label: formatMessage(messages['popup.nav.search']), icon: SearchIcon },
	{
		value: 'notifications',
		label: formatMessage(messages['popup.nav.notifications']),
		icon: BellIcon,
	},
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
const content = useTemplateRef<HTMLElement>('content')

// Same fade as Modrinth's scrollable panels, starting below a view's stuck header
const FADE_HEIGHT = 48
const fade = reactive({ start: 0, top: false, bottom: false })

function updateFade() {
	const element = scroller.value
	if (!element) return
	fade.top = element.scrollTop > 0
	fade.bottom = Math.ceil(element.scrollTop + element.clientHeight) < element.scrollHeight
	const scrollerTop = element.getBoundingClientRect().top
	const stuckBottoms = [...element.querySelectorAll('[data-sticky-header]')]
		.map((header) => header.getBoundingClientRect())
		.filter((rect) => rect.top - scrollerTop <= 1)
		.map((rect) => rect.bottom - scrollerTop)
	fade.start = Math.max(0, ...stuckBottoms)
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

// Loading content changes whether there is anything left to scroll to
watch([scroller, content], ([scrollerElement, contentElement]) => {
	layoutObserver?.disconnect()
	if (!scrollerElement || !contentElement) return
	layoutObserver = new ResizeObserver(updateFade)
	layoutObserver.observe(scrollerElement)
	layoutObserver.observe(contentElement)
})

onBeforeUnmount(() => layoutObserver?.disconnect())

const tabBar = useTemplateRef<HTMLElement>('tabBar')
const settingsButton = useTemplateRef<InstanceType<typeof IconButton>>('settingsButton')

function introductionTourTarget(target: IntroductionTourTarget): HTMLElement | null | undefined {
	if (target === 'settings') return settingsButton.value?.$el as HTMLElement | undefined
	return tabBar.value?.querySelectorAll<HTMLElement>('[role="tab"]')[MAIN_TABS.indexOf(target)]
}

function selectTab(value: string | number) {
	if (!MAIN_TABS.includes(value as MainTab)) return
	lastTab.value = value as MainTab
	view.value = lastTab.value
	if (scroller.value) scroller.value.scrollTop = 0
}

function toggleSettings() {
	view.value = view.value === 'settings' ? lastTab.value : 'settings'
}

watch(
	() => settings.themes,
	() => applyAccentColor(settings),
	{ deep: true, immediate: true },
)

watch(
	() => [settings.themes, themeLibrary.state],
	() => applyThemeSettings(settings, themeLibrary.state),
	{ deep: true, immediate: true },
)

onMounted(() => {
	void loadPopupSettings()
	void loadAccount()
})
</script>
