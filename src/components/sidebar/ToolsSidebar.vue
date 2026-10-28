<template>
	<div
		class="my-3 flex flex-col gap-3 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4"
	>
		<h2 class="m-0 text-lg font-semibold text-contrast">
			{{ formatMessage(messages['toolsSidebar.title']) }}
		</h2>
		<div class="flex min-w-0 max-w-full flex-col gap-3">
			<div class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal">
				<CodeIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<a
					:href="modfolioUrl"
					target="_blank"
					rel="noopener"
					class="min-w-0 flex-1 break-words leading-tight hover:underline"
				>
					{{ formatMessage(messages['toolsSidebar.generateEmbed']) }}
					<ExternalIcon
						aria-hidden="true"
						class="external-icon ml-1 inline !mb-0 align-[-0.125em]"
					/>
				</a>
			</div>
			<div v-if="projectSlug" class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal">
				<TerminalSquareIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<button
					class="min-w-0 flex-1 cursor-pointer whitespace-normal break-words border-0 bg-transparent p-0 text-left leading-tight text-primary hover:underline [font:inherit]"
					:aria-label="
						installCommandCopied
							? formatMessage(messages['toolsSidebar.copied'])
							: formatMessage(messages['toolsSidebar.copyInstallCommand'], {
									manager: modManagerLabel,
								})
					"
					@click="copyInstallCommand"
				>
					{{
						installCommandCopied
							? formatMessage(messages['toolsSidebar.copied'])
							: formatMessage(messages['toolsSidebar.copyInstallCommand'], {
									manager: modManagerLabel,
								})
					}}
					<CheckIcon
						v-if="installCommandCopied"
						aria-hidden="true"
						class="ml-1 inline size-4 align-[-0.125em] text-brand"
					/>
					<CopyIcon
						v-else
						aria-hidden="true"
						class="ml-1 inline size-4 align-[-0.125em] text-secondary"
					/>
				</button>
			</div>
			<div
				v-if="decompilerUrl"
				class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal"
			>
				<component :is="decompiler.icon" aria-hidden="true" class="mt-0.5 shrink-0" />
				<a
					:href="decompilerUrl"
					target="_blank"
					rel="noopener"
					class="min-w-0 flex-1 break-words leading-tight hover:underline"
				>
					{{ formatMessage(messages['toolsSidebar.decompileIn'], { tool: decompiler.label }) }}
					<ExternalIcon
						aria-hidden="true"
						class="external-icon ml-1 inline !mb-0 align-[-0.125em]"
					/>
				</a>
			</div>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	CheckIcon,
	CodeIcon,
	CoffeeIcon,
	CopyIcon,
	ExternalIcon,
	TerminalSquareIcon,
} from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { type Component, computed, onMounted, ref } from 'vue'

import ModsrcIcon from '../../assets/icons/modsrc.svg?component'
import { type DecompilerLinks, fetchDecompilerLinks } from '../../features/decompilers/links'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	'toolsSidebar.title': { id: 'toolsSidebar.title', defaultMessage: 'Tools' },
	'toolsSidebar.generateEmbed': {
		id: 'toolsSidebar.generateEmbed',
		defaultMessage: 'Generate embed',
	},
	'toolsSidebar.copyInstallCommand': {
		id: 'toolsSidebar.copyInstallCommand',
		defaultMessage: 'Copy {manager} command',
	},
	'toolsSidebar.copied': { id: 'toolsSidebar.copied', defaultMessage: 'Copied!' },
	'toolsSidebar.decompileIn': {
		id: 'toolsSidebar.decompileIn',
		defaultMessage: 'Decompile in {tool}',
	},
})

const props = defineProps<{
	pageUrl: string
	modManager: string
	decompiler: string
}>()

const MOD_MANAGERS: Record<
	string,
	{ label: string; command: (slug: string, type: string) => string }
> = {
	packwiz: {
		label: 'packwiz',
		command: (slug) => `packwiz mr add ${slug}`,
	},
	ferium: {
		label: 'Ferium',
		command: (slug, type) =>
			type === 'modpack' ? `ferium modpack add ${slug}` : `ferium add ${slug}`,
	},
	pakku: {
		label: 'Pakku',
		command: (slug) => `pakku add prj --mr ${slug}`,
	},
}

const DECOMPILERS: Record<
	'slicer' | 'modsrc',
	{ label: string; icon: Component; url: (links: DecompilerLinks) => string | null }
> = {
	// slicer's logo is Lucide's coffee icon
	slicer: { label: 'slicer', icon: CoffeeIcon, url: (links) => links.slicer },
	modsrc: { label: 'modsrc', icon: ModsrcIcon, url: (links) => links.modsrc },
}

const modfolioUrl = computed(
	() => `https://modfolio.creeperkatze.dev/?url=${encodeURIComponent(props.pageUrl)}`,
)

const projectMatch = computed(() => {
	try {
		const match = new URL(props.pageUrl).pathname.match(
			/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([^/]+)(?:\/version\/([^/?#]+))?/,
		)
		return match ? { type: match[1], slug: match[2], version: match[3] } : null
	} catch {
		return null
	}
})

const projectSlug = computed(() => projectMatch.value?.slug ?? null)

const modManager = computed(() => MOD_MANAGERS[props.modManager] ?? MOD_MANAGERS.packwiz)
const modManagerLabel = computed(() => modManager.value.label)

const installCommandCopied = ref(false)

async function copyInstallCommand() {
	if (!projectMatch.value) return
	const { slug, type } = projectMatch.value
	await navigator.clipboard.writeText(modManager.value.command(slug, type))
	installCommandCopied.value = true
	setTimeout(() => {
		installCommandCopied.value = false
	}, 1500)
}

const links = ref<DecompilerLinks | null>(null)

const decompiler = computed(
	() => DECOMPILERS[props.decompiler as keyof typeof DECOMPILERS] ?? DECOMPILERS.slicer,
)
const decompilerUrl = computed(() => (links.value ? decompiler.value.url(links.value) : null))

onMounted(async () => {
	const { type, slug, version } = projectMatch.value ?? {}
	if (!slug || type === 'modpack') return
	try {
		links.value = await fetchDecompilerLinks(slug, version)
	} catch (err) {
		console.error('[Modrinth Extras] Failed to fetch decompiler links:', err)
	}
})
</script>
