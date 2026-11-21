<template>
	<NewModal
		ref="modal"
		:header="formatMessage(messages['collectionDownload.title'])"
		max-width="600px"
		scrollable
		max-content-height="70vh"
		actions-divider
	>
		<div
			v-if="state === 'loading'"
			class="flex items-center justify-center gap-2 p-8 text-secondary"
		>
			<SpinnerIcon class="size-5 animate-spin" aria-hidden="true" />
			{{ formatMessage(messages['collectionDownload.loading']) }}
		</div>

		<div v-else-if="state === 'error'" class="flex flex-col items-center gap-3 p-8 text-center">
			<span class="text-secondary">{{ formatMessage(messages['collectionDownload.failed']) }}</span>
			<Button @click="load">
				<RefreshCwIcon aria-hidden="true" />
				{{ formatMessage(messages['collectionDownload.retry']) }}
			</Button>
		</div>

		<div v-else-if="state === 'ready' && !selection" class="p-8 text-center text-secondary">
			{{ formatMessage(messages['collectionDownload.nothing']) }}
		</div>

		<div v-else-if="selection" class="flex flex-col gap-6">
			<div class="grid grid-cols-1 gap-3 sm:grid-cols-2" role="radiogroup">
				<button
					v-for="option in formats"
					:key="option.format"
					type="button"
					role="radio"
					:aria-checked="format === option.format"
					class="m-0 flex appearance-none flex-col gap-2 rounded-2xl border-2 border-solid p-4 text-left transition-colors"
					:class="
						format === option.format
							? 'cursor-default border-brand bg-brand-highlight'
							: 'cursor-pointer border-surface-5 bg-surface-2 hover:bg-surface-3'
					"
					@click="format = option.format"
				>
					<span class="flex items-center gap-2 font-semibold text-contrast">
						<component
							:is="option.icon"
							class="size-5 shrink-0"
							:class="format === option.format ? 'text-brand' : 'text-secondary'"
							aria-hidden="true"
						/>
						{{ option.title }}
					</span>
					<span class="text-sm text-secondary">{{ option.description }}</span>
				</button>
			</div>

			<div class="grid grid-cols-1 gap-6" :class="{ 'sm:grid-cols-2': hasMods }">
				<div class="flex flex-col gap-2">
					<span class="font-semibold text-contrast">
						{{ formatMessage(messages['collectionDownload.gameVersion']) }}
					</span>
					<Combobox
						:model-value="selection.gameVersion"
						:options="gameVersionOptions"
						searchable
						@update:model-value="(gameVersion) => select({ gameVersion })"
					/>
				</div>
				<div v-if="hasMods" class="flex flex-col gap-2">
					<span class="font-semibold text-contrast">
						{{ formatMessage(messages['collectionDownload.loader']) }}
					</span>
					<Combobox
						:model-value="selection.loader"
						:options="loaderOptions"
						show-icon-in-selected
						@update:model-value="(loader) => select({ loader })"
					/>
				</div>
			</div>

			<label v-if="hasMods" class="flex cursor-pointer items-center justify-between gap-4">
				<span class="flex flex-col gap-0.5">
					<span class="font-semibold text-contrast">
						{{ formatMessage(messages['collectionDownload.dependencies']) }}
					</span>
					<span class="text-sm text-secondary">
						{{ formatMessage(messages['collectionDownload.dependenciesDescription']) }}
					</span>
				</span>
				<Toggle v-model="withDependencies" />
			</label>

			<section :class="sectionClass">
				<div class="flex items-center gap-2">
					<span class="font-semibold text-contrast">
						{{ formatMessage(messages['collectionDownload.included']) }}
					</span>
					<SpinnerIcon v-if="resolving" class="size-4 animate-spin text-secondary" />
					<TagItem v-else class="border-surface-3 bg-surface-3">{{ included.length }}</TagItem>
				</div>
				<div v-if="resolving" class="flex items-center gap-2 text-sm text-secondary">
					{{ formatMessage(messages['collectionDownload.resolving']) }}
				</div>
				<span v-else-if="included.length === 0" class="text-sm text-secondary">
					{{ formatMessage(messages['collectionDownload.noneIncluded']) }}
				</span>
				<ul v-else class="m-0 flex list-none flex-col gap-3 p-0">
					<li v-for="entry in included" :key="entry.project.id" class="flex items-center gap-3">
						<Avatar :src="entry.project.iconUrl" :alt="entry.project.name" size="2.25rem" />
						<div class="flex min-w-0 flex-1 flex-col">
							<span class="truncate font-medium text-contrast">{{ entry.project.name }}</span>
							<span class="truncate text-sm text-secondary">
								{{ kindLabel(entry.kind) }} · {{ entry.versionNumber }}
							</span>
						</div>
						<TagItem v-if="entry.dependency" class="shrink-0 border-surface-3 bg-surface-3">
							{{ formatMessage(messages['collectionDownload.dependency']) }}
						</TagItem>
					</li>
				</ul>
			</section>

			<section v-if="!resolving && incompatible.length > 0" :class="sectionClass">
				<div class="flex flex-col gap-0.5">
					<div class="flex items-center gap-2">
						<span class="font-semibold text-contrast">
							{{ formatMessage(messages['collectionDownload.incompatible']) }}
						</span>
						<TagItem class="border-surface-3 bg-surface-3">{{ incompatible.length }}</TagItem>
					</div>
					<span class="text-sm text-secondary">{{ incompatibleDescription }}</span>
				</div>
				<ul class="m-0 flex list-none flex-col gap-3 p-0 opacity-60">
					<li v-for="project in incompatible" :key="project.id" class="flex items-center gap-3">
						<Avatar :src="project.iconUrl" :alt="project.name" size="2.25rem" />
						<span class="min-w-0 truncate font-medium text-contrast">{{ project.name }}</span>
					</li>
				</ul>
			</section>

			<section v-if="unsupported.length > 0" :class="sectionClass">
				<div class="flex flex-col gap-0.5">
					<div class="flex items-center gap-2">
						<span class="font-semibold text-contrast">
							{{ formatMessage(messages['collectionDownload.unsupported']) }}
						</span>
						<TagItem class="border-surface-3 bg-surface-3">{{ unsupported.length }}</TagItem>
					</div>
					<span class="text-sm text-secondary">
						{{ formatMessage(messages['collectionDownload.unsupportedDescription']) }}
					</span>
				</div>
				<ul class="m-0 flex list-none flex-col gap-3 p-0 opacity-60">
					<li v-for="project in unsupported" :key="project.id" class="flex items-center gap-3">
						<Avatar :src="project.iconUrl" :alt="project.name" size="2.25rem" />
						<span class="min-w-0 truncate font-medium text-contrast">{{ project.name }}</span>
					</li>
				</ul>
			</section>
		</div>

		<template #actions>
			<div class="flex justify-end gap-2">
				<Button @click="modal?.hide()">
					<XIcon aria-hidden="true" />
					{{ formatMessage(messages['collectionDownload.cancel']) }}
				</Button>
				<Button
					type="colored"
					color="brand"
					:disabled="!selection || resolving || exporting || included.length === 0"
					@click="download"
				>
					<SpinnerIcon v-if="exporting" class="animate-spin" aria-hidden="true" />
					<DownloadIcon v-else aria-hidden="true" />
					{{ downloadLabel }}
				</Button>
			</div>
		</template>
	</NewModal>
</template>

<script setup lang="ts">
import {
	DownloadIcon,
	FolderArchiveIcon,
	getLoaderIcon,
	PackageIcon,
	RefreshCwIcon,
	SpinnerIcon,
	XIcon,
} from '@modrinth/assets'
import {
	Avatar,
	Button,
	Combobox,
	type ComboboxOption,
	defineMessages,
	formatLoader,
	NewModal,
	TagItem,
	Toggle,
	useVIntl,
} from '@modrinth/ui'
import { computed, h, ref, shallowRef, useTemplateRef, watch } from 'vue'

import { showNotification } from '../../content/notifications'
import {
	bestSelection,
	type CollectionProject,
	type ContentKind,
	fetchReleaseVersions,
	loadCollection,
	MOD_LOADERS,
	type ModLoader,
	mightSupport,
	type Selection,
} from '../../features/collection-download/collection'
import {
	buildMrpack,
	buildZip,
	type ExportFormat,
	exportFileName,
	MissingLoaderVersionError,
} from '../../features/collection-download/export'
import { type Resolution, resolveCollection } from '../../features/collection-download/resolve'
import { saveBlob } from '../../utils/dom'

const props = defineProps<{
	collectionId: string
	collectionName: string
}>()

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'collectionDownload.title': {
		id: 'collectionDownload.title',
		defaultMessage: 'Download collection',
	},
	'collectionDownload.loading': {
		id: 'collectionDownload.loading',
		defaultMessage: 'Loading projects…',
	},
	'collectionDownload.failed': {
		id: 'collectionDownload.failed',
		defaultMessage: "Couldn't load the projects of this collection.",
	},
	'collectionDownload.retry': { id: 'collectionDownload.retry', defaultMessage: 'Retry' },
	'collectionDownload.nothing': {
		id: 'collectionDownload.nothing',
		defaultMessage: 'None of the projects in this collection can be downloaded together.',
	},
	'collectionDownload.mrpack': { id: 'collectionDownload.mrpack', defaultMessage: 'Modpack' },
	'collectionDownload.mrpackDescription': {
		id: 'collectionDownload.mrpackDescription',
		defaultMessage: 'A .mrpack file to import into the Modrinth App, Prism Launcher and others.',
	},
	'collectionDownload.zip': { id: 'collectionDownload.zip', defaultMessage: 'Zip file' },
	'collectionDownload.zipDescription': {
		id: 'collectionDownload.zipDescription',
		defaultMessage: 'Every file sorted into its folder, ready to drop into an instance.',
	},
	'collectionDownload.gameVersion': {
		id: 'collectionDownload.gameVersion',
		defaultMessage: 'Game version',
	},
	'collectionDownload.loader': { id: 'collectionDownload.loader', defaultMessage: 'Loader' },
	'collectionDownload.projectCount': {
		id: 'collectionDownload.projectCount',
		defaultMessage: '{count, plural, one {# compatible project} other {# compatible projects}}',
	},
	'collectionDownload.dependencies': {
		id: 'collectionDownload.dependencies',
		defaultMessage: 'Include dependencies',
	},
	'collectionDownload.dependenciesDescription': {
		id: 'collectionDownload.dependenciesDescription',
		defaultMessage: 'Adds the mods that the included mods need to run.',
	},
	'collectionDownload.included': {
		id: 'collectionDownload.included',
		defaultMessage: 'Included',
	},
	'collectionDownload.resolving': {
		id: 'collectionDownload.resolving',
		defaultMessage: 'Finding the right versions…',
	},
	'collectionDownload.noneIncluded': {
		id: 'collectionDownload.noneIncluded',
		defaultMessage: 'No project has a version for this game version and loader.',
	},
	'collectionDownload.dependency': {
		id: 'collectionDownload.dependency',
		defaultMessage: 'Dependency',
	},
	'collectionDownload.incompatible': {
		id: 'collectionDownload.incompatible',
		defaultMessage: 'Not compatible',
	},
	'collectionDownload.incompatibleDescription': {
		id: 'collectionDownload.incompatibleDescription',
		defaultMessage: 'No version for {loader} {gameVersion}.',
	},
	'collectionDownload.incompatibleVersionDescription': {
		id: 'collectionDownload.incompatibleVersionDescription',
		defaultMessage: 'No version for {gameVersion}.',
	},
	'collectionDownload.unsupported': {
		id: 'collectionDownload.unsupported',
		defaultMessage: "Can't be included",
	},
	'collectionDownload.unsupportedDescription': {
		id: 'collectionDownload.unsupportedDescription',
		defaultMessage: "Plugins and modpacks don't go into an instance.",
	},
	'collectionDownload.mod': { id: 'collectionDownload.mod', defaultMessage: 'Mod' },
	'collectionDownload.resourcepack': {
		id: 'collectionDownload.resourcepack',
		defaultMessage: 'Resource pack',
	},
	'collectionDownload.shader': { id: 'collectionDownload.shader', defaultMessage: 'Shader' },
	'collectionDownload.datapack': { id: 'collectionDownload.datapack', defaultMessage: 'Data pack' },
	'collectionDownload.cancel': { id: 'collectionDownload.cancel', defaultMessage: 'Cancel' },
	'collectionDownload.download': {
		id: 'collectionDownload.download',
		defaultMessage: 'Download {count, plural, one {# project} other {# projects}}',
	},
	'collectionDownload.downloading': {
		id: 'collectionDownload.downloading',
		defaultMessage: 'Downloading {done} of {total}',
	},
	'collectionDownload.exportFailed': {
		id: 'collectionDownload.exportFailed',
		defaultMessage: "Couldn't download the collection",
	},
	'collectionDownload.exportFailedText': {
		id: 'collectionDownload.exportFailedText',
		defaultMessage: 'Some files could not be downloaded. Try again in a moment.',
	},
	'collectionDownload.noLoaderVersion': {
		id: 'collectionDownload.noLoaderVersion',
		defaultMessage: 'There is no {loader} release for {gameVersion} yet.',
	},
})

const sectionClass =
	'flex flex-col gap-3 rounded-2xl border border-solid border-surface-5 bg-surface-2 p-4'

const modal = useTemplateRef<InstanceType<typeof NewModal>>('modal')

const state = ref<'idle' | 'loading' | 'error' | 'ready'>('idle')
const projects = shallowRef<CollectionProject[]>([])
const releases = shallowRef<string[]>([])
const selection = ref<Selection | null>(null)
const format = ref<ExportFormat>('mrpack')
const withDependencies = ref(true)
const resolution = shallowRef<Resolution | null>(null)
const resolving = ref(false)
const exporting = ref(false)
const exported = ref(0)

const formats = computed(() => [
	{
		format: 'mrpack' as const,
		icon: PackageIcon,
		title: formatMessage(messages['collectionDownload.mrpack']),
		description: formatMessage(messages['collectionDownload.mrpackDescription']),
	},
	{
		format: 'zip' as const,
		icon: FolderArchiveIcon,
		title: formatMessage(messages['collectionDownload.zip']),
		description: formatMessage(messages['collectionDownload.zipDescription']),
	},
])

const installable = computed(() => projects.value.filter((project) => project.kind))
const unsupported = computed(() => projects.value.filter((project) => !project.kind))
const hasMods = computed(() => installable.value.some((project) => project.kind === 'mod'))

function countFor(next: Selection): number {
	return installable.value.filter((project) => mightSupport(project, next)).length
}

function projectCount(count: number): string {
	return formatMessage(messages['collectionDownload.projectCount'], { count })
}

// Only versions at least one project supports, each with how many do
const gameVersionOptions = computed<ComboboxOption<string>[]>(() => {
	if (!selection.value) return []
	const loader = selection.value.loader
	return releases.value.flatMap((gameVersion) => {
		const count = countFor({ gameVersion, loader })
		return count > 0
			? [{ value: gameVersion, label: gameVersion, subLabel: projectCount(count) }]
			: []
	})
})

// Colored like Modrinth's loader filters, inline so it wins over the dropdown's icon color
function loaderIcon(loader: string) {
	const icon = getLoaderIcon(loader)
	if (!icon) return undefined
	return () => h(icon, { style: { color: `var(--color-platform-${loader})` } })
}

const loaderOptions = computed<ComboboxOption<ModLoader>[]>(() => {
	if (!selection.value) return []
	const gameVersion = selection.value.gameVersion
	return MOD_LOADERS.map((loader) => ({
		value: loader,
		label: formatLoader(formatMessage, loader),
		subLabel: projectCount(countFor({ gameVersion, loader })),
		icon: loaderIcon(loader),
	}))
})

const included = computed(() => resolution.value?.included ?? [])

const incompatible = computed(() => {
	const ids = new Set(included.value.map((entry) => entry.project.id))
	return installable.value.filter((project) => !ids.has(project.id))
})

const incompatibleDescription = computed(() => {
	if (!selection.value) return ''
	const { gameVersion, loader } = selection.value
	return hasMods.value
		? formatMessage(messages['collectionDownload.incompatibleDescription'], {
				loader: formatLoader(formatMessage, loader),
				gameVersion,
			})
		: formatMessage(messages['collectionDownload.incompatibleVersionDescription'], { gameVersion })
})

const downloadLabel = computed(() =>
	exporting.value && format.value === 'zip'
		? formatMessage(messages['collectionDownload.downloading'], {
				done: exported.value,
				total: included.value.length,
			})
		: formatMessage(messages['collectionDownload.download'], { count: included.value.length }),
)

function kindLabel(kind: ContentKind): string {
	return formatMessage(messages[`collectionDownload.${kind}`])
}

async function load() {
	state.value = 'loading'
	try {
		const [loaded, versions] = await Promise.all([
			loadCollection(props.collectionId),
			fetchReleaseVersions(),
		])
		projects.value = loaded
		releases.value = versions
		selection.value = bestSelection(
			loaded.filter((project) => project.kind),
			versions,
		)
		state.value = 'ready'
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load collection:', err)
		state.value = 'error'
	}
}

function select(change: Partial<Selection>) {
	if (selection.value) selection.value = { ...selection.value, ...change }
}

// A newer pick cancels the lookups of the one before
let controller: AbortController | null = null

watch([selection, withDependencies], async ([next, dependencies]) => {
	controller?.abort()
	if (!next) return
	const current = new AbortController()
	controller = current
	resolving.value = true
	try {
		const result = await resolveCollection(projects.value, next, dependencies, current.signal)
		if (current.signal.aborted) return
		resolution.value = result
	} catch (err) {
		if (current.signal.aborted) return
		console.error('[Modrinth Extras] Failed to resolve collection versions:', err)
		resolution.value = { included: [] }
	} finally {
		if (controller === current) resolving.value = false
	}
})

async function download() {
	if (!selection.value || included.value.length === 0) return
	exporting.value = true
	exported.value = 0
	try {
		const blob =
			format.value === 'mrpack'
				? await buildMrpack(props.collectionName, selection.value, included.value)
				: await buildZip(included.value, (done) => (exported.value = done))
		saveBlob(blob, exportFileName(props.collectionName, format.value))
		modal.value?.hide()
	} catch (err) {
		console.error('[Modrinth Extras] Failed to download collection:', err)
		const { loader, gameVersion } = selection.value
		showNotification({
			type: 'error',
			title: formatMessage(messages['collectionDownload.exportFailed']),
			text:
				err instanceof MissingLoaderVersionError
					? formatMessage(messages['collectionDownload.noLoaderVersion'], {
							loader: formatLoader(formatMessage, loader),
							gameVersion,
						})
					: formatMessage(messages['collectionDownload.exportFailedText']),
		})
	} finally {
		exporting.value = false
	}
}

// Projects only load once the modal is opened, so visiting a collection costs no requests
function open() {
	modal.value?.show()
	if (state.value === 'idle' || state.value === 'error') void load()
}

defineExpose({ open })
</script>
