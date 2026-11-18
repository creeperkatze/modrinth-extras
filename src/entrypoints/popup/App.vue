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
			<template v-else>
				<div class="flex shrink-0 flex-col gap-2 px-3 pt-3">
					<DiscordCard />
					<DonateCard />
					<Tabs
						:value="view"
						:tabs="tabs"
						class="!w-full [&>button]:min-w-0 [&>button]:flex-auto [&>button]:px-2 [&_span]:truncate"
						@update:value="selectTab"
					/>
				</div>
				<!-- Keyed by tab so switching starts at the top -->
				<SearchView v-if="view === 'search'" key="search" />
				<CreatorView v-else key="creator" />
			</template>
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
import { computed, onMounted, ref, watch } from 'vue'

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

function selectTab(value: string | number) {
	if (!MAIN_TABS.includes(value as MainTab)) return
	lastTab.value = value as MainTab
	view.value = lastTab.value
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
