<template>
	<NewModal
		ref="modal"
		:header="
			isNew
				? formatMessage(messages['customTheme.createTitle'])
				: formatMessage(messages['customTheme.editTitle'])
		"
		max-width="580px"
		scrollable
		max-content-height="70vh"
		actions-divider
	>
		<div v-if="draft" class="flex flex-col gap-6">
			<div
				class="overflow-hidden rounded-2xl border border-solid border-surface-5"
				:class="`${draft.base}-mode`"
				:style="themeVariables(draft)"
				aria-hidden="true"
			>
				<div class="flex flex-col gap-3 bg-surface-1 p-4 text-primary">
					<div
						class="flex items-center gap-3 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-3"
					>
						<div class="size-11 shrink-0 rounded-xl bg-surface-4" />
						<div class="flex min-w-0 flex-1 flex-col gap-0.5">
							<span class="truncate font-semibold text-contrast">
								{{ formatMessage(messages['customTheme.previewTitle']) }}
							</span>
							<span class="truncate text-sm text-secondary">
								{{ formatMessage(messages['customTheme.previewDescription']) }}
							</span>
						</div>
						<span
							class="shrink-0 rounded-xl bg-brand px-3 py-1.5 text-sm font-semibold text-brand-inverted"
						>
							{{ formatMessage(messages['customTheme.previewButton']) }}
						</span>
					</div>
					<div class="flex flex-wrap gap-2">
						<span
							v-for="tag in previewTags"
							:key="tag.label"
							class="rounded-full px-2.5 py-0.5 text-xs font-semibold"
							:class="tag.class"
						>
							{{ tag.label }}
						</span>
					</div>
				</div>
			</div>

			<div class="flex flex-col gap-2">
				<span class="font-semibold text-contrast">
					{{ formatMessage(messages['customTheme.name']) }}
				</span>
				<Input
					:model-value="draft.name"
					:placeholder="formatMessage(messages['customTheme.namePlaceholder'])"
					:maxlength="NAME_MAX_LENGTH"
					autocomplete="off"
					wrapper-class="w-full"
					@update:model-value="(name) => update((next) => (next.name = String(name ?? '')))"
				/>
			</div>

			<div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
				<div class="flex flex-col gap-2">
					<span class="font-semibold text-contrast">
						{{ formatMessage(messages['customTheme.base']) }}
					</span>
					<Chips
						:model-value="draft.base"
						:items="BASES"
						:format-label="baseLabel"
						:capitalize="false"
						@update:model-value="(base) => base && update((next) => (next.base = base))"
					/>
				</div>
				<div class="flex flex-col gap-2">
					<span class="font-semibold text-contrast">
						{{ formatMessage(messages['customTheme.startFrom']) }}
					</span>
					<Combobox
						:options="presetOptions"
						:model-value="undefined"
						:placeholder="formatMessage(messages['customTheme.startFromPlaceholder'])"
						@update:model-value="copyFrom"
					/>
				</div>
			</div>

			<section :class="sectionClass">
				<div class="flex flex-col gap-0.5">
					<span class="font-semibold text-contrast">
						{{ formatMessage(messages['customTheme.surfaces']) }}
					</span>
					<span class="text-sm text-secondary">
						{{ formatMessage(messages['customTheme.surfacesDescription']) }}
					</span>
				</div>
				<div class="grid grid-cols-7 gap-2">
					<div
						v-for="(surface, index) in draft.surfaces"
						:key="index"
						class="flex flex-col items-center gap-1"
					>
						<ColorPicker
							:model-value="surface"
							:label="`${formatMessage(messages['customTheme.surfaces'])} ${SURFACE_LEVELS[index]}`"
							@update:model-value="(color) => update((next) => (next.surfaces[index] = color))"
						/>
						<span class="text-xs font-medium text-secondary">{{ SURFACE_LEVELS[index] }}</span>
					</div>
				</div>
			</section>

			<section v-for="group in groups" :key="group.title" :class="sectionClass">
				<span class="font-semibold text-contrast">{{ group.title }}</span>
				<div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
					<div v-for="field in group.fields" :key="field.label" class="flex items-center gap-3">
						<ColorPicker
							:model-value="field.get(draft)"
							:label="field.label"
							size="sm"
							@update:model-value="(color) => update((next) => field.set(next, color))"
						/>
						<span class="text-sm text-primary">{{ field.label }}</span>
					</div>
				</div>
			</section>
		</div>
		<template #actions>
			<div class="flex flex-wrap items-center gap-2">
				<Button v-if="!isNew" type="outlined" color="red" @click="remove">
					<TrashIcon aria-hidden="true" />
					{{ formatMessage(messages['customTheme.delete']) }}
				</Button>
				<Button @click="exportTheme">
					<DownloadIcon aria-hidden="true" />
					{{ formatMessage(messages['customTheme.export']) }}
				</Button>
				<div class="ml-auto flex gap-2">
					<Button @click="modal?.hide()">
						<XIcon aria-hidden="true" />
						{{ formatMessage(messages['customTheme.cancel']) }}
					</Button>
					<Button type="colored" color="brand" @click="save">
						<SaveIcon aria-hidden="true" />
						{{ formatMessage(messages['customTheme.save']) }}
					</Button>
				</div>
			</div>
		</template>
	</NewModal>
</template>

<script setup lang="ts">
import { DownloadIcon, SaveIcon, TrashIcon, XIcon } from '@modrinth/assets'
import {
	Button,
	Chips,
	ColorPicker,
	Combobox,
	defineMessages,
	Input,
	NewModal,
	useVIntl,
} from '@modrinth/ui'
import { computed, ref, shallowRef, useTemplateRef } from 'vue'

import type { NamedTheme, ThemeColors } from '../../core/settings'
import {
	EXTRA_THEMES,
	exportThemeFile,
	MODRINTH_THEMES,
	themeFileName,
	themeVariables,
} from '../../features/themes/themes'

const emit = defineEmits<{
	save: [theme: NamedTheme]
	delete: [id: string]
}>()

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'customTheme.createTitle': { id: 'customTheme.createTitle', defaultMessage: 'Create theme' },
	'customTheme.editTitle': { id: 'customTheme.editTitle', defaultMessage: 'Edit theme' },
	'customTheme.previewTitle': {
		id: 'customTheme.previewTitle',
		defaultMessage: 'Example project',
	},
	'customTheme.previewDescription': {
		id: 'customTheme.previewDescription',
		defaultMessage: 'This is how your theme looks on Modrinth.',
	},
	'customTheme.previewButton': { id: 'customTheme.previewButton', defaultMessage: 'Download' },
	'customTheme.name': { id: 'customTheme.name', defaultMessage: 'Name' },
	'customTheme.namePlaceholder': {
		id: 'customTheme.namePlaceholder',
		defaultMessage: 'My theme',
	},
	'customTheme.base': { id: 'customTheme.base', defaultMessage: 'Base' },
	'customTheme.dark': { id: 'customTheme.dark', defaultMessage: 'Dark' },
	'customTheme.light': { id: 'customTheme.light', defaultMessage: 'Light' },
	'customTheme.startFrom': { id: 'customTheme.startFrom', defaultMessage: 'Start from' },
	'customTheme.startFromPlaceholder': {
		id: 'customTheme.startFromPlaceholder',
		defaultMessage: 'Choose a theme',
	},
	'customTheme.surfaces': { id: 'customTheme.surfaces', defaultMessage: 'Surfaces' },
	'customTheme.surfacesDescription': {
		id: 'customTheme.surfacesDescription',
		defaultMessage: 'From the page background on the left to borders on the right.',
	},
	'customTheme.text': { id: 'customTheme.text', defaultMessage: 'Text' },
	'customTheme.headings': { id: 'customTheme.headings', defaultMessage: 'Headings' },
	'customTheme.body': { id: 'customTheme.body', defaultMessage: 'Body text' },
	'customTheme.secondary': { id: 'customTheme.secondary', defaultMessage: 'Secondary text' },
	'customTheme.divider': { id: 'customTheme.divider', defaultMessage: 'Dividers' },
	'customTheme.accent': { id: 'customTheme.accent', defaultMessage: 'Accent' },
	'customTheme.accentColor': { id: 'customTheme.accentColor', defaultMessage: 'Accent color' },
	'customTheme.accentText': { id: 'customTheme.accentText', defaultMessage: 'Text on accent' },
	'customTheme.colors': { id: 'customTheme.colors', defaultMessage: 'Colors' },
	'customTheme.red': { id: 'customTheme.red', defaultMessage: 'Red' },
	'customTheme.orange': { id: 'customTheme.orange', defaultMessage: 'Orange' },
	'customTheme.blue': { id: 'customTheme.blue', defaultMessage: 'Blue' },
	'customTheme.purple': { id: 'customTheme.purple', defaultMessage: 'Purple' },
	'customTheme.delete': { id: 'customTheme.delete', defaultMessage: 'Delete' },
	'customTheme.export': { id: 'customTheme.export', defaultMessage: 'Export' },
	'customTheme.cancel': { id: 'customTheme.cancel', defaultMessage: 'Cancel' },
	'customTheme.save': { id: 'customTheme.save', defaultMessage: 'Save' },
})

const NAME_MAX_LENGTH = 64
const BASES: ThemeColors['base'][] = ['dark', 'light']
// Modrinth's own names for its surface levels
const SURFACE_LEVELS = ['1', '1.5', '2', '2.5', '3', '4', '5']
const sectionClass =
	'flex flex-col gap-3 rounded-2xl border border-solid border-surface-5 bg-surface-2 p-4'

const modal = useTemplateRef<InstanceType<typeof NewModal>>('modal')

// Edits stay in this copy until they are saved
const draft = shallowRef<NamedTheme | null>(null)
const isNew = ref(false)

function open(theme: NamedTheme, creating: boolean) {
	draft.value = structuredClone(theme)
	isNew.value = creating
	modal.value?.show()
}

function update(change: (next: NamedTheme) => void) {
	if (!draft.value) return
	const next = structuredClone(draft.value)
	change(next)
	draft.value = next
}

function baseLabel(base: ThemeColors['base']): string {
	return formatMessage(messages[base === 'dark' ? 'customTheme.dark' : 'customTheme.light'])
}

const previewTags = computed(() => [
	{ label: formatMessage(messages['customTheme.accent']), class: 'bg-highlight-green text-green' },
	{ label: formatMessage(messages['customTheme.red']), class: 'bg-highlight-red text-red' },
	{
		label: formatMessage(messages['customTheme.orange']),
		class: 'bg-highlight-orange text-orange',
	},
	{ label: formatMessage(messages['customTheme.blue']), class: 'bg-highlight-blue text-blue' },
	{
		label: formatMessage(messages['customTheme.purple']),
		class: 'bg-highlight-purple text-purple',
	},
])

const presets = [...MODRINTH_THEMES, ...EXTRA_THEMES]
const presetOptions = presets.map((preset) => ({ label: preset.name, value: preset.id }))

// Keeps the theme's own id and name, only the colors are copied
function copyFrom(presetId: string) {
	const preset = presets.find((candidate) => candidate.id === presetId)
	if (!preset || !draft.value) return
	draft.value = { ...structuredClone(preset), id: draft.value.id, name: draft.value.name }
}

function exportTheme() {
	if (!draft.value) return
	const blob = new Blob([exportThemeFile(draft.value)], { type: 'application/json' })
	const url = URL.createObjectURL(blob)
	const anchor = document.createElement('a')
	anchor.href = url
	anchor.download = themeFileName(draft.value.name)
	anchor.style.display = 'none'
	document.body.appendChild(anchor)
	anchor.click()
	anchor.remove()
	setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function save() {
	if (!draft.value) return
	emit('save', { ...draft.value, name: draft.value.name.trim() || draft.value.name })
	modal.value?.hide()
}

function remove() {
	if (!draft.value) return
	emit('delete', draft.value.id)
	modal.value?.hide()
}

interface ColorField {
	label: string
	get: (theme: ThemeColors) => string
	set: (theme: ThemeColors, color: string) => void
}

const groups = computed<{ title: string; fields: ColorField[] }[]>(() => [
	{
		title: formatMessage(messages['customTheme.text']),
		fields: [
			{
				label: formatMessage(messages['customTheme.headings']),
				get: (colors) => colors.text.primary,
				set: (colors, color) => (colors.text.primary = color),
			},
			{
				label: formatMessage(messages['customTheme.body']),
				get: (colors) => colors.text.default,
				set: (colors, color) => (colors.text.default = color),
			},
			{
				label: formatMessage(messages['customTheme.secondary']),
				get: (colors) => colors.text.tertiary,
				set: (colors, color) => (colors.text.tertiary = color),
			},
			{
				label: formatMessage(messages['customTheme.divider']),
				get: (colors) => colors.divider,
				set: (colors, color) => (colors.divider = color),
			},
		],
	},
	{
		title: formatMessage(messages['customTheme.accent']),
		fields: [
			{
				label: formatMessage(messages['customTheme.accentColor']),
				get: (colors) => colors.accent,
				set: (colors, color) => (colors.accent = color),
			},
			{
				label: formatMessage(messages['customTheme.accentText']),
				get: (colors) => colors.accentContrast,
				set: (colors, color) => (colors.accentContrast = color),
			},
		],
	},
	{
		title: formatMessage(messages['customTheme.colors']),
		fields: (['red', 'orange', 'blue', 'purple'] as const).map((name) => ({
			label: formatMessage(messages[`customTheme.${name}`]),
			get: (colors) => colors.colors[name],
			set: (colors, color) => (colors.colors[name] = color),
		})),
	},
])

defineExpose({ open })
</script>
