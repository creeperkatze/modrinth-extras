<template>
	<div
		v-if="project || error"
		class="relative my-3 flex flex-col gap-3 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4"
	>
		<div
			v-if="project?.grade"
			v-tooltip="formatMessage(messages.gradeTooltip, { grade: project.grade })"
			class="absolute right-4 top-4 flex size-10 items-center justify-center rounded-xl text-2xl font-bold"
			:class="gradeClass(project.grade)"
		>
			{{ project.grade }}
		</div>
		<h2 class="m-0 text-lg font-semibold text-contrast">Modgrade</h2>
		<div class="flex min-w-0 max-w-full flex-col gap-3">
			<div
				v-if="error"
				class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal text-secondary"
			>
				<TriangleAlertIcon aria-hidden="true" class="mt-0.5 shrink-0" />
				<span class="min-w-0 flex-1 break-words leading-tight">
					{{ formatMessage(messages.loadError) }}
				</span>
			</div>
			<template v-else-if="project">
				<span
					v-for="row in rows"
					:key="row.key"
					v-tooltip="row.tooltip"
					class="flex w-full min-w-0 max-w-full items-start gap-2"
					:class="row.class ?? 'font-normal'"
				>
					<component
						:is="row.icon"
						aria-hidden="true"
						class="mt-0.5 shrink-0"
						:class="row.iconClass"
					/>
					<span class="min-w-0 flex-1 break-words leading-tight">{{ row.text }}</span>
				</span>
				<a
					:href="project.url"
					target="_blank"
					rel="noopener"
					class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal hover:underline"
				>
					<ShieldIcon aria-hidden="true" class="mt-0.5 shrink-0" />
					<span class="min-w-0 flex-1 break-words leading-tight">
						{{ formatMessage(messages.viewReport) }}
						<ExternalIcon
							aria-hidden="true"
							class="external-icon ml-1 inline !mb-0 align-[-0.125em]"
						/>
					</span>
				</a>
			</template>
		</div>
	</div>
</template>

<script setup lang="ts">
import {
	CodeIcon,
	ExternalIcon,
	FileSearchCornerIcon,
	InfoIcon,
	ShieldAlertIcon,
	ShieldCheckIcon,
	ShieldIcon,
	TriangleAlertIcon,
} from '@modrinth/assets'
import { defineMessages, useVIntl } from '@modrinth/ui'
import { type Component, computed, onMounted, ref } from 'vue'
import { browser } from 'wxt/browser'

import { modrinthClient } from '../../api/client'
import type { ModgradeProject, ModgradeResult } from '../../background/external/modgrade'

const { formatMessage } = useVIntl()
const messages = defineMessages({
	loadError: { id: 'modgradeSidebar.loadError', defaultMessage: 'Failed to load Modgrade data' },
	gradeTooltip: { id: 'modgradeSidebar.gradeTooltip', defaultMessage: 'Grade {grade}' },
	passed: { id: 'modgradeSidebar.passed', defaultMessage: 'No issues found' },
	partlyChecked: { id: 'modgradeSidebar.partlyChecked', defaultMessage: 'Partly checked' },
	warning: { id: 'modgradeSidebar.warning', defaultMessage: 'Suspicious code found' },
	malware: { id: 'modgradeSidebar.malware', defaultMessage: 'Malware found' },
	possibleMalware: {
		id: 'modgradeSidebar.possibleMalware',
		defaultMessage: 'Possible malware in an included project',
	},
	malwareElsewhere: {
		id: 'modgradeSidebar.malwareElsewhere',
		defaultMessage: 'Malware found on another platform only',
	},
	someFiles: {
		id: 'modgradeSidebar.someFiles',
		defaultMessage: 'Only some files are affected',
	},
	notChecked: { id: 'modgradeSidebar.notChecked', defaultMessage: 'Not checked yet' },
	checked: {
		id: 'modgradeSidebar.checked',
		defaultMessage:
			'{checked} of {total, plural, one {# latest file} other {# latest files}} checked',
	},
	recentVersionsOnly: {
		id: 'modgradeSidebar.recentVersionsOnly',
		defaultMessage: 'Only files for recent Minecraft versions count',
	},
	readInPart: {
		id: 'modgradeSidebar.readInPart',
		defaultMessage: '{count, plural, one {# file} other {# files}} only partly readable',
	},
	cannotCheck: {
		id: 'modgradeSidebar.cannotCheck',
		defaultMessage: "{count, plural, one {# file} other {# files}} can't be downloaded for checks",
	},
	viewReport: { id: 'modgradeSidebar.viewReport', defaultMessage: 'View on Modgrade' },
})

const props = defineProps<{ pageUrl: string }>()

interface Row {
	key: string
	icon: Component
	text: string
	class?: string
	iconClass?: string
	tooltip?: string
}

const project = ref<ModgradeProject | null>(null)
const malwareOnModrinth = ref(false)
const error = ref(false)

function gradeClass(grade: string): string {
	if (grade <= 'B') return 'bg-highlight-green text-green'
	if (grade <= 'D') return 'bg-highlight-orange text-orange'
	return 'bg-highlight-red text-red'
}

function securityRow(p: ModgradeProject): Row {
	switch (p.security) {
		case 'passed':
			return {
				key: 'security',
				icon: ShieldCheckIcon,
				text: formatMessage(messages.passed),
				iconClass: 'text-green',
			}
		case 'partly_checked':
			return { key: 'security', icon: ShieldIcon, text: formatMessage(messages.partlyChecked) }
		case 'warning':
			return {
				key: 'security',
				icon: ShieldAlertIcon,
				text: formatMessage(messages.warning),
				class: 'font-semibold text-orange',
			}
		case 'malware':
			// The same project can be clean on Modrinth when the malware was only published elsewhere
			if (!malwareOnModrinth.value) {
				return { key: 'security', icon: ShieldIcon, text: formatMessage(messages.malwareElsewhere) }
			}
			return {
				key: 'security',
				icon: ShieldAlertIcon,
				text: formatMessage(p.malware_confirmed ? messages.malware : messages.possibleMalware),
				class: p.malware_confirmed ? 'font-semibold text-red' : 'font-semibold text-orange',
			}
		default:
			return {
				key: 'security',
				icon: ShieldIcon,
				text: formatMessage(messages.notChecked),
				class: 'font-normal text-secondary',
			}
	}
}

const rows = computed<Row[]>(() => {
	const p = project.value
	if (!p) return []
	const rows = [securityRow(p)]

	if (p.security === 'malware' && malwareOnModrinth.value && p.malware_scope === 'some_files') {
		rows.push({ key: 'scope', icon: InfoIcon, text: formatMessage(messages.someFiles) })
	}
	// The note repeats the security result for malware
	if (p.grade_note && p.security !== 'malware') {
		rows.push({ key: 'note', icon: InfoIcon, text: p.grade_note })
	}

	const coverage = p.coverage
	if (coverage && coverage.latest_files > 0) {
		rows.push({
			key: 'checked',
			icon: FileSearchCornerIcon,
			text: formatMessage(messages.checked, {
				checked: coverage.checked,
				total: coverage.latest_files,
			}),
			tooltip: coverage.recent_versions_only
				? formatMessage(messages.recentVersionsOnly)
				: undefined,
		})
		if (coverage.read_in_part > 0) {
			rows.push({
				key: 'readInPart',
				icon: CodeIcon,
				text: formatMessage(messages.readInPart, { count: coverage.read_in_part }),
			})
		}
		if (coverage.cannot_check > 0) {
			rows.push({
				key: 'cannotCheck',
				icon: CodeIcon,
				text: formatMessage(messages.cannotCheck, { count: coverage.cannot_check }),
			})
		}
	}

	return rows
})

onMounted(async () => {
	try {
		const slug = new URL(props.pageUrl).pathname.match(
			/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([^/]+)/,
		)?.[2]
		if (!slug) return

		const { id } = await modrinthClient.labrinth.projects_v3.get(slug)
		const response = (await browser.runtime.sendMessage({
			type: 'modgrade-project',
			projectId: id,
		})) as { ok: boolean; result?: ModgradeResult | null }
		if (!response?.ok) {
			error.value = true
			return
		}
		project.value = response.result?.project ?? null
		malwareOnModrinth.value = response.result?.malwareOnModrinth ?? false
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load Modgrade data:', err)
		error.value = true
	}
})
</script>
