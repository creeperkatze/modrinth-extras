<template>
	<div class="card flex-card experimental-styles-within">
		<h2>{{ formatMessage(messages['toolsSidebar.title']) }}</h2>
		<div class="details-list min-w-0 max-w-full">
			<div class="details-list__item !w-full min-w-0 max-w-full !items-start">
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
			<div v-if="projectSlug" class="details-list__item !w-full min-w-0 max-w-full !items-start">
				<TerminalSquareIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<button
					class="min-w-0 flex-1 cursor-pointer whitespace-normal break-words border-0 bg-transparent p-0 text-left leading-tight text-primary hover:underline [font:inherit]"
					:aria-label="
						installCommandCopied
							? formatMessage(messages['toolsSidebar.copied'])
							: formatMessage(messages['toolsSidebar.copyInstallCommand'], {
									manager: packageManagerLabel,
								})
					"
					@click="copyInstallCommand"
				>
					{{
						installCommandCopied
							? formatMessage(messages['toolsSidebar.copied'])
							: formatMessage(messages['toolsSidebar.copyInstallCommand'], {
									manager: packageManagerLabel,
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
		</div>
	</div>
</template>

<script setup lang="ts">
import { CheckIcon, CodeIcon, CopyIcon, ExternalIcon, TerminalSquareIcon } from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { computed, ref } from 'vue'

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
})

const props = defineProps<{
	pageUrl: string
	packageManager: string
}>()

const PACKAGE_MANAGERS: Record<
	string,
	{ label: string; command: (slug: string, type: string) => string }
> = {
	packwiz: {
		label: 'packwiz',
		command: (slug) => `packwiz mr add ${slug}`,
	},
	ferium: {
		label: 'ferium',
		command: (slug, type) =>
			type === 'modpack' ? `ferium modpack add ${slug}` : `ferium add ${slug}`,
	},
}

const modfolioUrl = computed(
	() => `https://modfolio.creeperkatze.dev/?url=${encodeURIComponent(props.pageUrl)}`,
)

const projectMatch = computed(() => {
	try {
		const match = new URL(props.pageUrl).pathname.match(
			/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([^/]+)/,
		)
		return match ? { type: match[1], slug: match[2] } : null
	} catch {
		return null
	}
})

const projectSlug = computed(() => projectMatch.value?.slug ?? null)

const packageManager = computed(
	() => PACKAGE_MANAGERS[props.packageManager] ?? PACKAGE_MANAGERS.packwiz,
)
const packageManagerLabel = computed(() => packageManager.value.label)

const installCommandCopied = ref(false)

async function copyInstallCommand() {
	if (!projectMatch.value) return
	const { slug, type } = projectMatch.value
	await navigator.clipboard.writeText(packageManager.value.command(slug, type))
	installCommandCopied.value = true
	setTimeout(() => {
		installCommandCopied.value = false
	}, 1500)
}
</script>
