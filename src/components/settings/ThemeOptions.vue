<template>
	<!-- Padding, since the website resets the top margin of a card's first child -->
	<div class="flex flex-col gap-3 pt-2">
		<ThemeSection
			v-for="category in categories"
			:key="category.id"
			:title="categoryTitle(category)"
			:count="category.themes.length"
			:open-by-default="openSection === category.id"
		>
			<div class="theme-grid">
				<ThemeCard
					v-for="theme in category.themes"
					:id="theme.id"
					:key="theme.id"
					:name="theme.name"
					:base="theme.base"
					:selected="selected === theme.id"
					@select="select(theme)"
				/>
			</div>
		</ThemeSection>

		<ThemeSection
			:title="formatMessage(messages['themes.section.custom'])"
			:count="customThemes.length"
			:open-by-default="openSection === CUSTOM_SECTION"
		>
			<div class="theme-grid">
				<div v-for="theme in customThemes" :key="theme.id" class="custom-theme relative">
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
							v-tooltip="formatMessage(messages['themes.edit'])"
							type="quiet"
							size="sm"
							:label="formatMessage(messages['themes.edit'])"
							@click="edit(theme)"
						>
							<EditIcon aria-hidden="true" />
						</IconButton>
						<IconButton
							v-tooltip="formatMessage(messages['themes.delete'])"
							type="quiet"
							color="red"
							size="sm"
							:label="formatMessage(messages['themes.delete'])"
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
						{{ formatMessage(messages['themes.create']) }}
					</Button>
					<Button type="quiet" @click="fileInput?.click()">
						<UploadIcon aria-hidden="true" />
						{{ formatMessage(messages['themes.import']) }}
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
			</div>
		</ThemeSection>

		<CustomThemeModal ref="customModal" @save="saveTheme" @delete="remove" />
	</div>
</template>

<script setup lang="ts">
import { EditIcon, PlusIcon, TrashIcon, UploadIcon } from '@modrinth/assets'
import { Button, defineMessages, IconButton, useVIntl } from '@modrinth/ui'
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, useTemplateRef, watch } from 'vue'

import { showNotification } from '../../content/notifications'
import { getSettings, type NamedTheme, saveSettings } from '../../core/settings'
import { useSettings } from '../../core/settings-store'
import {
	PRESET_THEMES,
	MODRINTH_THEMES,
	type ThemeCategory,
	THEME_CATEGORIES,
} from '../../features/themes/presets'
import { applyTheme, createCustomTheme, importThemeFile } from '../../features/themes/themes'
import CustomThemeModal from './CustomThemeModal.vue'
import ThemeCard from './ThemeCard.vue'
import ThemeSection from './ThemeSection.vue'

const props = defineProps<{
	savedSelected: string
	savedCustom: NamedTheme[]
}>()

const settings = useSettings()
const showPresets = computed(() => settings.themes.presets)

const CUSTOM_SECTION = 'custom'

const SELECTED_ATTRIBUTE = 'data-modrinth-extras-theme-selected'

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'themes.section.minecraft': {
		id: 'themes.section.minecraft',
		defaultMessage: 'Minecraft',
	},
	'themes.section.classics': {
		id: 'themes.section.classics',
		defaultMessage: 'Classics',
	},
	'themes.section.custom': { id: 'themes.section.custom', defaultMessage: 'Custom' },
	'themes.create': { id: 'themes.create', defaultMessage: 'Create theme' },
	'themes.import': { id: 'themes.import', defaultMessage: 'Import' },
	'themes.edit': { id: 'themes.edit', defaultMessage: 'Edit theme' },
	'themes.delete': { id: 'themes.delete', defaultMessage: 'Delete theme' },
	'themes.newTheme': { id: 'themes.newTheme', defaultMessage: 'My theme' },
	'themes.importFailed': {
		id: 'themes.importFailed',
		defaultMessage: "Couldn't import {file}",
	},
	'themes.importInvalid': {
		id: 'themes.importInvalid',
		defaultMessage: "This file isn't a valid theme.",
	},
	'themes.importNewer': {
		id: 'themes.importNewer',
		defaultMessage:
			'This theme was made with a newer version of Modrinth Extras. Update the extension to import it.',
	},
})

// Only the extension stores these, like the accent color, so they apply and save right away
const selected = ref(props.savedSelected)
const customThemes = shallowRef<NamedTheme[]>(structuredClone(props.savedCustom))

// Families like Catppuccin keep their own name
const categoryMessages: Partial<Record<string, (typeof messages)[keyof typeof messages]>> = {
	minecraft: messages['themes.section.minecraft'],
	classics: messages['themes.section.classics'],
}

function categoryTitle(category: ThemeCategory): string {
	const message = categoryMessages[category.id]
	return message ? formatMessage(message) : category.name
}

const categories = computed(() => (showPresets.value ? THEME_CATEGORIES : []))

// Only the section with the theme in use starts open
const openSection = props.savedCustom.some((theme) => theme.id === props.savedSelected)
	? CUSTOM_SECTION
	: THEME_CATEGORIES.find((category) =>
			category.themes.some((theme) => theme.id === props.savedSelected),
		)?.id

const customModal = useTemplateRef<InstanceType<typeof CustomThemeModal>>('customModal')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

let grid: HTMLElement | null = null

watch([selected, customThemes], async ([id, themes]) => {
	applyTheme(id, themes, showPresets.value)
	try {
		const saved = await getSettings()
		await saveSettings({ ...saved, themeLibrary: { selected: id, custom: themes } })
	} catch (err) {
		console.error('[Modrinth Extras] Failed to save the themes:', err)
	}
})

// The website's own setting is left alone, so no save button shows up for it
function select(theme: Pick<NamedTheme, 'id'>) {
	selected.value = theme.id
}

// A hidden preset stays saved but doesn't apply, so the website's theme still counts as picked
function isAvailable(id: string): boolean {
	if (customThemes.value.some((theme) => theme.id === id)) return true
	return showPresets.value && PRESET_THEMES.some((theme) => theme.id === id)
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
		uniqueName(formatMessage(messages['themes.newTheme'])),
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
	const imported: NamedTheme[] = []
	for (const file of files) {
		const result = importThemeFile(await file.text(), file.name.replace(/\.json$/i, ''))
		if ('theme' in result) {
			imported.push(result.theme)
			continue
		}
		showNotification({
			type: 'error',
			title: formatMessage(messages['themes.importFailed'], { file: file.name }),
			text: formatMessage(
				messages[result.error === 'newer' ? 'themes.importNewer' : 'themes.importInvalid'],
			),
		})
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
	const button = (event.target as Element | null)?.closest('button.preview-radio')
	if (button && button.parentElement === grid) selected.value = ''
}

// Marks the grid so the website's base theme is drawn unselected next to ours
watch([selected, showPresets], ([id]) => grid?.toggleAttribute(SELECTED_ATTRIBUTE, isAvailable(id)))

onMounted(() => {
	grid = document.querySelector<HTMLElement>('.theme-options')
	grid?.toggleAttribute(SELECTED_ATTRIBUTE, isAvailable(selected.value))
	grid?.addEventListener('click', onGridClick, true)
})

onBeforeUnmount(() => {
	grid?.removeAttribute(SELECTED_ATTRIBUTE)
	grid?.removeEventListener('click', onGridClick, true)
})
</script>

<style scoped>
/* Laid out like the website's own theme grid, with every card the same width */
.theme-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(12rem, 1fr));
	gap: var(--gap-lg);
}

/* Pressing the card shrinks it together with its buttons, which sit outside the card itself */
.custom-theme {
	transition: scale 0.05s ease-in-out;
}

.custom-theme:has(> .preview-radio:active) {
	scale: 0.95;
}

/* Repeated class, so this always outranks Modrinth's own press rule */
.custom-theme > .preview-radio.preview-radio:active {
	scale: 1;
}
</style>

<style lang="scss">
// The website still marks the base theme as selected while one of ours is, so it is drawn unselected
.theme-options[data-modrinth-extras-theme-selected] > .preview-radio.selected {
	color: var(--color-base);

	.label .radio {
		display: none;
	}

	// Modrinth's unchecked radio icon
	.label::before {
		content: '';
		flex-shrink: 0;
		width: 1em;
		height: 1em;
		margin-right: 0.5rem;
		background-color: currentColor;
		mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10s10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8s8 3.58 8 8s-3.58 8-8 8z'/%3E%3C/svg%3E")
			center / contain no-repeat;
	}
}
</style>
