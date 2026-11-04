<template>
	<div
		v-if="project || error"
		class="my-3 flex flex-col gap-3 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-4"
	>
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
					<span class="flex min-w-0 flex-1 flex-col gap-1 break-words leading-tight">
						<span>{{ row.text }}</span>
						<span
							v-for="detail in row.details"
							:key="detail"
							class="text-sm font-normal text-secondary"
						>
							{{ detail }}
						</span>
					</span>
				</span>
				<a
					:href="project.url"
					target="_blank"
					rel="noopener"
					class="flex w-full min-w-0 max-w-full items-start gap-2 font-normal hover:underline"
				>
					<ModgradeIcon aria-hidden="true" class="mt-0.5 shrink-0" />
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
	ClockIcon,
	CodeIcon,
	ExternalIcon,
	FileSearchCornerIcon,
	InfoIcon,
	ShieldAlertIcon,
	ShieldCheckIcon,
	ShieldIcon,
	TriangleAlertIcon,
} from '@modrinth/assets'
import { defineMessages, useRelativeTime, useVIntl } from '@modrinth/ui'
import { type Component, computed, onMounted, ref } from 'vue'
import { browser } from 'wxt/browser'

import ModgradeIcon from '../../assets/icons/modgrade.svg?component'
import type { ModgradeProject, ModgradeResult } from '../../background/external/modgrade'

const { formatMessage } = useVIntl()
const formatRelativeTime = useRelativeTime()
const messages = defineMessages({
	loadError: { id: 'modgradeSidebar.loadError', defaultMessage: 'Failed to load Modgrade data' },
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
	readInPart: {
		id: 'modgradeSidebar.readInPart',
		defaultMessage: '{count, plural, one {# file} other {# files}} only partly readable',
	},
	cannotCheck: {
		id: 'modgradeSidebar.cannotCheck',
		defaultMessage: "{count, plural, one {# file} other {# files}} can't be downloaded for checks",
	},
	lastChecked: { id: 'modgradeSidebar.lastChecked', defaultMessage: 'Last checked {time}' },
	unknownMalwareReason: {
		id: 'modgradeSidebar.unknownMalwareReason',
		defaultMessage: 'Other malicious behavior',
	},
	unknownWarningReason: {
		id: 'modgradeSidebar.unknownWarningReason',
		defaultMessage: 'Other suspicious behavior',
	},
	viewReport: { id: 'modgradeSidebar.viewReport', defaultMessage: 'View on Modgrade' },
})

// Keyed by Modgrade's reason codes
const reasonMessages = defineMessages({
	steals_logins: {
		id: 'modgradeSidebar.reason.stealsLogins',
		defaultMessage: 'Steals logins, tokens or the game session',
	},
	runs_downloaded_code: {
		id: 'modgradeSidebar.reason.runsDownloadedCode',
		defaultMessage: 'Downloads hidden code and runs it',
	},
	installs_program: {
		id: 'modgradeSidebar.reason.installsProgram',
		defaultMessage: 'Downloads or carries a program and starts it',
	},
	remote_control: {
		id: 'modgradeSidebar.reason.remoteControl',
		defaultMessage: 'Lets others run commands on the computer or server',
	},
	miner: {
		id: 'modgradeSidebar.reason.miner',
		defaultMessage: 'Runs a hidden cryptocurrency miner',
	},
	swaps_crypto_addresses: {
		id: 'modgradeSidebar.reason.swapsCryptoAddresses',
		defaultMessage: 'Replaces crypto addresses copied to the clipboard',
	},
	starts_at_login: {
		id: 'modgradeSidebar.reason.startsAtLogin',
		defaultMessage: 'Installs itself to start at login',
	},
	known_malware: {
		id: 'modgradeSidebar.reason.knownMalware',
		defaultMessage: 'Matches known malware',
	},
	reads_login_data: {
		id: 'modgradeSidebar.reason.readsLoginData',
		defaultMessage: 'Reads the login data of other programs',
	},
	sends_session_token: {
		id: 'modgradeSidebar.reason.sendsSessionToken',
		defaultMessage: 'Sends the Minecraft login token somewhere other than Mojang',
	},
	names_startup_places: {
		id: 'modgradeSidebar.reason.namesStartupPlaces',
		defaultMessage: 'Refers to places that start programs at login',
	},
	reads_clipboard_crypto: {
		id: 'modgradeSidebar.reason.readsClipboardCrypto',
		defaultMessage: 'Reads crypto addresses from the clipboard',
	},
	loads_code_at_start: {
		id: 'modgradeSidebar.reason.loadsCodeAtStart',
		defaultMessage: 'Loads code from a fixed address at start',
	},
	matches_security_report: {
		id: 'modgradeSidebar.reason.matchesSecurityReport',
		defaultMessage: 'Matches a public security report',
	},
	disguised_file: {
		id: 'modgradeSidebar.reason.disguisedFile',
		defaultMessage: 'Contains a file that is not what its name says',
	},
	replaced_program: {
		id: 'modgradeSidebar.reason.replacedProgram',
		defaultMessage: 'The newest file is a different program that hides its addresses',
	},
	licence_unlocked_code: {
		id: 'modgradeSidebar.reason.licenceUnlockedCode',
		defaultMessage: 'Downloads and runs code unlocked by a license key',
	},
	records_and_clipboard: {
		id: 'modgradeSidebar.reason.recordsAndClipboard',
		defaultMessage: 'Records the microphone or screen and replaces the clipboard',
	},
	downloads_code_http: {
		id: 'modgradeSidebar.reason.downloadsCodeHttp',
		defaultMessage: 'Downloads code without encryption',
	},
	downloads_and_runs_code: {
		id: 'modgradeSidebar.reason.downloadsAndRunsCode',
		defaultMessage: 'Downloads and runs code without checking it',
	},
	sends_ip_address: {
		id: 'modgradeSidebar.reason.sendsIpAddress',
		defaultMessage: 'Sends the IP address and location to Discord',
	},
	hidden_address: {
		id: 'modgradeSidebar.reason.hiddenAddress',
		defaultMessage: 'Hides a web address in its code',
	},
	discord_webhook: {
		id: 'modgradeSidebar.reason.discordWebhook',
		defaultMessage: 'Sends data to a Discord webhook',
	},
	reads_browser_history: {
		id: 'modgradeSidebar.reason.readsBrowserHistory',
		defaultMessage: 'Reads the browser history',
	},
	sends_screenshots: {
		id: 'modgradeSidebar.reason.sendsScreenshots',
		defaultMessage: 'Sends screenshots',
	},
	sends_clipboard: {
		id: 'modgradeSidebar.reason.sendsClipboard',
		defaultMessage: 'Sends the clipboard contents',
	},
	sends_computer_id: {
		id: 'modgradeSidebar.reason.sendsComputerId',
		defaultMessage: 'Sends a computer identifier',
	},
})

const props = defineProps<{ pageUrl: string }>()

interface Row {
	key: string
	icon: Component
	text: string
	class?: string
	iconClass?: string
	tooltip?: string
	details?: string[]
}

const project = ref<ModgradeProject | null>(null)
const malwareOnModrinth = ref(false)
const error = ref(false)

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
				class: 'font-normal text-orange',
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
				class: p.malware_confirmed ? 'font-normal text-red' : 'font-normal text-orange',
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

// New codes can appear before the extension knows them, so those get a general text
function reasonText(code: string, isMalware: boolean): string {
	if (Object.hasOwn(reasonMessages, code)) {
		return formatMessage(reasonMessages[code as keyof typeof reasonMessages])
	}
	return formatMessage(isMalware ? messages.unknownMalwareReason : messages.unknownWarningReason)
}

function reasonDetails(p: ModgradeProject): string[] {
	const isMalware = p.security === 'malware'
	if (!isMalware && p.security !== 'warning') return []
	if (isMalware && !malwareOnModrinth.value) return []
	return [...new Set((p.reasons ?? []).map((code) => reasonText(code, isMalware)))]
}

const rows = computed<Row[]>(() => {
	const p = project.value
	if (!p) return []
	const rows: Row[] = [{ ...securityRow(p), details: reasonDetails(p) }]

	if (p.security === 'malware' && malwareOnModrinth.value && p.malware_scope === 'some_files') {
		rows.push({ key: 'scope', icon: InfoIcon, text: formatMessage(messages.someFiles) })
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

	if (p.checked_at) {
		rows.push({
			key: 'lastChecked',
			icon: ClockIcon,
			text: formatMessage(messages.lastChecked, { time: formatRelativeTime(p.checked_at) }),
			tooltip: new Date(p.checked_at).toLocaleString(),
		})
	}

	return rows
})

onMounted(async () => {
	try {
		const slug = new URL(props.pageUrl).pathname.match(
			/^\/(mod|plugin|datapack|shader|resourcepack|modpack)\/([^/]+)/,
		)?.[2]
		if (!slug) return

		const response = (await browser.runtime.sendMessage({
			type: 'modgrade-project',
			slug,
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
