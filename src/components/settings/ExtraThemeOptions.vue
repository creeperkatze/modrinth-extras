<template>
	<HorizontalRule class="col-span-full" />
	<ThemeCard
		v-for="theme in EXTRA_THEMES"
		:id="theme.id"
		:key="theme.id"
		:name="theme.name"
		:base="theme.base"
		:selected="selected === theme.id"
		@select="select(theme)"
	/>
	<div v-for="theme in customThemes" :key="theme.id" class="relative">
		<ThemeCard
			:id="theme.id"
			:name="theme.name"
			:base="theme.base"
			:selected="selected === theme.id"
			has-actions
			@select="select(theme)"
		/>
		<!-- Wrapped, since the buttons set their own position -->
		<div class="absolute bottom-1 right-1.5 flex items-center gap-1">
			<IconButton
				v-tooltip="formatMessage(messages['extraThemes.edit'])"
				type="quiet"
				size="sm"
				:label="formatMessage(messages['extraThemes.edit'])"
				@click="edit(theme)"
			>
				<EditIcon aria-hidden="true" />
			</IconButton>
			<IconButton
				v-tooltip="formatMessage(messages['extraThemes.delete'])"
				type="quiet"
				color="red"
				size="sm"
				:label="formatMessage(messages['extraThemes.delete'])"
				@click="remove(theme.id)"
			>
				<TrashIcon aria-hidden="true" />
			</IconButton>
		</div>
	</div>
	<div
		class="flex min-h-36 flex-col items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 border-dashed border-surface-5 p-4"
	>
		<Button @click="create">
			<PlusIcon aria-hidden="true" />
			{{ formatMessage(messages['extraThemes.create']) }}
		</Button>
		<Button type="quiet" @click="fileInput?.click()">
			<UploadIcon aria-hidden="true" />
			{{ formatMessage(messages['extraThemes.import']) }}
		</Button>
		<input
			ref="fileInput"
			type="file"
			accept=".json,application/json"
			multiple
			class="hidden"
			@change="importFiles"
		/>
	</div>
	<SettingsInlineWarning v-if="importFailed" class="col-span-full">
		{{ formatMessage(messages['extraThemes.importFailed']) }}
	</SettingsInlineWarning>

	<CustomThemeModal ref="customModal" @save="saveTheme" @delete="remove" />
</template>

<script setup lang="ts">
import { EditIcon, PlusIcon, TrashIcon, UploadIcon } from '@modrinth/assets'
import {
	Button,
	defineMessages,
	HorizontalRule,
	IconButton,
	SettingsInlineWarning,
	useVIntl,
} from '@modrinth/ui'
import { onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'

import { getSettings, type NamedTheme, saveSettings, type ThemeColors } from '../../core/settings'
import {
	applyExtraTheme,
	createCustomTheme,
	EXTRA_THEMES,
	importThemeFile,
	MODRINTH_THEMES,
} from '../../features/themes/themes'
import CustomThemeModal from './CustomThemeModal.vue'
import ThemeCard from './ThemeCard.vue'

const props = defineProps<{
	savedSelected: string
	savedCustom: NamedTheme[]
	containerId: string
}>()

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'extraThemes.create': { id: 'extraThemes.create', defaultMessage: 'Create theme' },
	'extraThemes.import': { id: 'extraThemes.import', defaultMessage: 'Import' },
	'extraThemes.edit': { id: 'extraThemes.edit', defaultMessage: 'Edit theme' },
	'extraThemes.delete': { id: 'extraThemes.delete', defaultMessage: 'Delete theme' },
	'extraThemes.newTheme': { id: 'extraThemes.newTheme', defaultMessage: 'My theme' },
	'extraThemes.importFailed': {
		id: 'extraThemes.importFailed',
		defaultMessage: "Some files couldn't be imported because they aren't valid themes.",
	},
})

// Only the extension stores these, like the accent color, so they apply and save right away
const selected = ref(props.savedSelected)
const customThemes = shallowRef<NamedTheme[]>(structuredClone(props.savedCustom))
const importFailed = ref(false)

const customModal = useTemplateRef<InstanceType<typeof CustomThemeModal>>('customModal')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

let grid: HTMLElement | null = null
let selectingBase = false

watch([selected, customThemes], async ([id, themes]) => {
	applyExtraTheme(id, themes)
	try {
		const settings = await getSettings()
		await saveSettings({ ...settings, themes: { selected: id, custom: themes } })
	} catch (err) {
		console.error('[Modrinth Extras] Failed to save the themes:', err)
	}
})

// The website's own buttons sit next to ours in the grid, starting with "Sync with system"
function baseButton(base: ThemeColors['base']): HTMLElement | undefined {
	const websiteButtons = grid
		? [...grid.querySelectorAll<HTMLElement>(':scope > button.preview-radio')]
		: []
	return websiteButtons
		.slice(1)
		.find((button) => button.querySelector('.preview')?.classList.contains(`${base}-mode`))
}

// The base theme is what Modrinth saves for the site and the app, through its own save button
function selectBase(base: ThemeColors['base']) {
	const button = baseButton(base)
	if (!button || button.classList.contains('selected')) return
	selectingBase = true
	button.click()
	selectingBase = false
}

function select(theme: Pick<NamedTheme, 'id' | 'base'>) {
	selected.value = theme.id
	selectBase(theme.base)
}

function uniqueName(name: string): string {
	const taken = new Set(customThemes.value.map((theme) => theme.name))
	if (!taken.has(name)) return name
	let number = 2
	while (taken.has(`${name} ${number}`)) number++
	return `${name} ${number}`
}

// New themes start from Modrinth's own dark theme and only appear once saved
function create() {
	const theme = createCustomTheme(
		uniqueName(formatMessage(messages['extraThemes.newTheme'])),
		MODRINTH_THEMES[0]!,
	)
	customModal.value?.open(theme, true)
}

function edit(theme: NamedTheme) {
	customModal.value?.open(theme, false)
}

function saveTheme(theme: NamedTheme) {
	const exists = customThemes.value.some((existing) => existing.id === theme.id)
	customThemes.value = exists
		? customThemes.value.map((existing) => (existing.id === theme.id ? theme : existing))
		: [...customThemes.value, theme]
	if (!exists || selected.value === theme.id) select(theme)
}

async function importFiles(event: Event) {
	const input = event.target as HTMLInputElement
	const files = [...(input.files ?? [])]
	input.value = ''
	importFailed.value = false
	const imported: NamedTheme[] = []
	for (const file of files) {
		const theme = importThemeFile(await file.text(), file.name.replace(/\.json$/i, ''))
		if (theme) imported.push(theme)
		else importFailed.value = true
	}
	for (const theme of imported) {
		customThemes.value = [...customThemes.value, { ...theme, name: uniqueName(theme.name) }]
	}
	const last = imported.at(-1)
	if (last) select(last)
}

function remove(id: string) {
	customThemes.value = customThemes.value.filter((theme) => theme.id !== id)
	if (selected.value === id) selected.value = ''
}

function onGridClick(event: MouseEvent) {
	if (selectingBase) return
	const button = (event.target as Element | null)?.closest('button.preview-radio')
	if (button && button.parentElement === grid) selected.value = ''
}

onMounted(() => {
	grid = document.getElementById(props.containerId)?.parentElement ?? null
	grid?.addEventListener('click', onGridClick, true)
})

onBeforeUnmount(() => grid?.removeEventListener('click', onGridClick, true))
</script>
