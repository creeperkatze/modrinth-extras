<template>
	<!-- Built like the project cards: the card opens the dashboard, its buttons and labels don't -->
	<div class="[&>.smart-clickable]:grid-cols-[minmax(0,1fr)]">
		<SmartClickable>
			<template #clickable>
				<a
					:href="modrinthUrl(dashboardPath)"
					:aria-label="server.name"
					class="no-click-animation custom-focus-indicator rounded-2xl outline-none"
					@click.prevent="openModrinth(dashboardPath)"
				/>
			</template>
			<div
				class="flex flex-col gap-3 rounded-2xl border border-solid border-surface-4 bg-surface-3 p-3 transition-all smart-clickable:outline-on-focus smart-clickable:highlight-on-hover"
			>
				<div class="flex items-center gap-3">
					<ServerIcon
						:image="server.iconUrl ?? undefined"
						:disabled="server.status === 'suspended'"
						class="!size-12 !rounded-xl"
					/>
					<div class="flex min-w-0 flex-1 flex-col gap-1">
						<span class="truncate font-semibold text-contrast smart-clickable:underline-on-hover">
							{{ server.name }}
						</span>
						<div
							class="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-sm font-medium text-secondary"
						>
							<span
								v-if="server.mcVersion"
								v-tooltip="`${server.game} ${server.mcVersion}`"
								class="flex items-center gap-1 smart-clickable:allow-pointer-events"
							>
								<GameIcon class="size-4 shrink-0" aria-hidden="true" />
								{{ server.mcVersion }}
							</span>
							<span
								v-if="server.loader && server.loader !== 'Vanilla'"
								v-tooltip="[server.loader, server.loaderVersion].filter(Boolean).join(' ')"
								class="flex items-center gap-1 smart-clickable:allow-pointer-events"
							>
								<TagIcon
									:tag="server.loader"
									enforce-type="loader"
									class="size-4 shrink-0"
									aria-hidden="true"
								/>
								{{ server.loaderVersion ?? server.loader }}
							</span>
							<span
								v-if="uptimeSeconds !== undefined"
								v-tooltip="
									formatMessage(messages['popup.hosting.uptime'], {
										duration: formatUptime(uptimeSeconds),
									})
								"
								class="flex items-center gap-1 smart-clickable:allow-pointer-events"
							>
								<TimerIcon class="size-4 shrink-0" aria-hidden="true" />
								{{ formatUptime(uptimeSeconds) }}
							</span>
						</div>
					</div>
				</div>

				<template v-if="server.status === 'suspended'">
					<p class="m-0 text-sm text-secondary">{{ suspendedNotice }}</p>
					<Button
						v-if="server.suspensionReason !== 'moderated'"
						type="colored"
						color="brand"
						class="w-fit smart-clickable:allow-pointer-events"
						@click="openModrinth(`/settings/billing#server-${server.id}`)"
					>
						<CardIcon aria-hidden="true" />
						{{ formatMessage(messages['popup.hosting.manageBilling']) }}
					</Button>
				</template>

				<template v-else>
					<div v-if="live" class="grid grid-cols-3 gap-2">
						<div
							v-for="resource in resources"
							:key="resource.key"
							v-tooltip="resource.tooltip"
							:aria-label="resource.tooltip"
							class="flex flex-col gap-1.5 smart-clickable:allow-pointer-events"
						>
							<div class="flex min-w-0 items-center gap-1.5 text-sm">
								<component
									:is="resource.icon"
									class="size-4 shrink-0 text-secondary"
									aria-hidden="true"
								/>
								<span class="truncate font-medium text-contrast">{{ resource.value }}</span>
							</div>
							<div class="h-1.5 overflow-hidden rounded-full bg-surface-4">
								<div
									class="h-full rounded-full transition-[width] duration-500"
									:class="resource.percent >= 90 ? 'bg-[var(--color-red)]' : 'bg-brand'"
									:style="{ width: `${resource.percent}%` }"
								/>
							</div>
						</div>
					</div>

					<!-- The same buttons, colors and states as the website's dashboard -->
					<div
						v-if="server.status === 'installing'"
						class="flex flex-wrap items-center gap-2 smart-clickable:allow-pointer-events"
					>
						<Button type="colored" color="brand" disabled>
							<LoaderCircleIcon class="animate-spin" aria-hidden="true" />
							{{ formatMessage(messages['popup.hosting.installing']) }}
						</Button>
					</div>
					<div
						v-else-if="live"
						class="flex flex-wrap items-center gap-2 smart-clickable:allow-pointer-events"
					>
						<Button
							v-if="live.pendingAction.value === 'Start'"
							type="colored"
							color="brand"
							disabled
						>
							<LoaderCircleIcon class="animate-spin" aria-hidden="true" />
							{{ formatMessage(messages['popup.hosting.startingServer']) }}
						</Button>
						<template v-else-if="powerState === 'running' || powerState === 'starting'">
							<Button
								v-tooltip="powerTooltip"
								type="colored"
								color="orange"
								:disabled="!canAct"
								@click="live.sendPowerAction('Restart')"
							>
								<UpdatedIcon aria-hidden="true" />
								{{ formatMessage(messages['popup.hosting.restart']) }}
							</Button>
							<Button
								v-tooltip="powerTooltip"
								type="colored"
								color="red"
								:disabled="!canAct"
								@click="live.sendPowerAction('Stop')"
							>
								<StopCircleIcon aria-hidden="true" />
								{{ formatMessage(messages['popup.hosting.stop']) }}
							</Button>
						</template>
						<Button
							v-else-if="powerState === 'stopping'"
							type="colored"
							color="red"
							disabled
							class="opacity-60"
						>
							<StopCircleIcon aria-hidden="true" />
							{{ formatMessage(messages['popup.hosting.stopping']) }}
						</Button>
						<Button
							v-else
							v-tooltip="powerTooltip"
							type="colored"
							color="brand"
							:disabled="!canAct"
							@click="live.sendPowerAction('Start')"
						>
							<PlayIcon aria-hidden="true" />
							{{ formatMessage(messages['popup.hosting.start']) }}
						</Button>
					</div>

					<p v-if="notice" class="m-0 text-sm" :class="notice.class">{{ notice.text }}</p>

					<button
						v-if="server.address"
						v-tooltip="formatMessage(messages['popup.hosting.copyAddress'])"
						type="button"
						class="flex w-fit min-w-0 cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-sm font-medium text-primary hover:underline smart-clickable:allow-pointer-events"
						@click="copyAddress"
					>
						<CheckIcon
							v-if="copied"
							class="size-4 shrink-0 text-[var(--color-green)]"
							aria-hidden="true"
						/>
						<CopyIcon v-else class="size-4 shrink-0" aria-hidden="true" />
						<span class="truncate">{{ server.address }}</span>
					</button>
				</template>
			</div>
		</SmartClickable>
	</div>
</template>

<script setup lang="ts">
import {
	CardIcon,
	CheckIcon,
	CopyIcon,
	CpuIcon,
	DatabaseIcon,
	GameIcon,
	LoaderCircleIcon,
	MemoryStickIcon,
	PlayIcon,
	StopCircleIcon,
	TimerIcon,
	UpdatedIcon,
} from '@modrinth/assets'
import { Button, defineMessages, ServerIcon, SmartClickable, TagIcon, useVIntl } from '@modrinth/ui'
import { computed, onBeforeUnmount, ref, watch } from 'vue'

import { i18n } from '../../../../core/i18n/i18n'
import { useServerLive } from '../../../../features/hosting/live'
import type { HostingServer } from '../../../../features/hosting/servers'
import { formatBytes } from '../../../../utils/bytes'
import { modrinthUrl, openModrinth } from '../../utils/tabs'

const props = defineProps<{
	server: HostingServer
}>()

const { formatMessage } = useVIntl()

const messages = defineMessages({
	'popup.hosting.uptime': {
		id: 'popup.hosting.uptime',
		defaultMessage: 'Online for {duration}',
	},
	'popup.hosting.manageBilling': {
		id: 'popup.hosting.manageBilling',
		defaultMessage: 'Manage billing',
	},
	'popup.hosting.copyAddress': {
		id: 'popup.hosting.copyAddress',
		defaultMessage: 'Copy address',
	},
	'popup.hosting.cpu': { id: 'popup.hosting.cpu', defaultMessage: 'CPU' },
	'popup.hosting.resourceValue': {
		id: 'popup.hosting.resourceValue',
		defaultMessage: '{resource}: {value}',
	},
	'popup.hosting.resourceUsage': {
		id: 'popup.hosting.resourceUsage',
		defaultMessage: '{resource}: {used} of {total}',
	},
	'popup.hosting.memory': { id: 'popup.hosting.memory', defaultMessage: 'Memory' },
	'popup.hosting.storage': { id: 'popup.hosting.storage', defaultMessage: 'Storage' },
	'popup.hosting.start': { id: 'popup.hosting.start', defaultMessage: 'Start' },
	'popup.hosting.startingServer': {
		id: 'popup.hosting.startingServer',
		defaultMessage: 'Starting server...',
	},
	'popup.hosting.stop': { id: 'popup.hosting.stop', defaultMessage: 'Stop' },
	'popup.hosting.stopping': { id: 'popup.hosting.stopping', defaultMessage: 'Stopping' },
	'popup.hosting.restart': { id: 'popup.hosting.restart', defaultMessage: 'Restart' },
	'popup.hosting.installing': { id: 'popup.hosting.installing', defaultMessage: 'Installing...' },
	'popup.hosting.noPermission': {
		id: 'popup.hosting.noPermission',
		defaultMessage: "You don't have permission to do this",
	},
	'popup.hosting.actionFailed': {
		id: 'popup.hosting.actionFailed',
		defaultMessage:
			'The server could not be {action, select, Start {started} Stop {stopped} other {restarted}}.',
	},
	'popup.hosting.crashed': {
		id: 'popup.hosting.crashed',
		defaultMessage: 'The server crashed. Open the dashboard to see why.',
	},
	'popup.hosting.broken': {
		id: 'popup.hosting.broken',
		defaultMessage: 'Something went wrong with this server. Open the dashboard to see why.',
	},
	'popup.hosting.connectionFailed': {
		id: 'popup.hosting.connectionFailed',
		defaultMessage: 'The live status could not be loaded.',
	},
	'popup.hosting.notice.cancelled': {
		id: 'popup.hosting.notice.cancelled',
		defaultMessage: 'The subscription for this server was cancelled.',
	},
	'popup.hosting.notice.paymentfailed': {
		id: 'popup.hosting.notice.paymentfailed',
		defaultMessage: 'The subscription for this server was cancelled because a payment failed.',
	},
	'popup.hosting.notice.moderated': {
		id: 'popup.hosting.notice.moderated',
		defaultMessage: 'This server was suspended by the moderators. Contact support to learn more.',
	},
	'popup.hosting.notice.upgrading': {
		id: 'popup.hosting.notice.upgrading',
		defaultMessage: "This server's hardware is being upgraded and will be back shortly.",
	},
	'popup.hosting.notice.other': {
		id: 'popup.hosting.notice.other',
		defaultMessage: 'This server is suspended.',
	},
})

const dashboardPath = computed(() => `/hosting/manage/${props.server.id}`)

// Only servers that can run have a live connection
const live = props.server.status === 'available' ? useServerLive(props.server.id) : null

const powerState = computed(() => live?.powerState.value ?? null)

const isUp = computed(
	() =>
		powerState.value === 'running' ||
		powerState.value === 'starting' ||
		powerState.value === 'stopping',
)

// Like the website, nothing can be done while the server is changing state
const canAct = computed(
	() =>
		props.server.canUsePowerActions &&
		!live?.pendingAction.value &&
		(powerState.value === 'running' ||
			powerState.value === 'stopped' ||
			powerState.value === 'crashed'),
)

const powerTooltip = computed(() =>
	props.server.canUsePowerActions
		? undefined
		: formatMessage(messages['popup.hosting.noPermission']),
)

const notice = computed(() => {
	const failedAction = live?.actionFailed.value
	if (failedAction) {
		return {
			text: formatMessage(messages['popup.hosting.actionFailed'], { action: failedAction }),
			class: 'text-[var(--color-red)]',
		}
	}
	if (props.server.status === 'broken') {
		return {
			text: formatMessage(messages['popup.hosting.broken']),
			class: 'text-[var(--color-red)]',
		}
	}
	if (powerState.value === 'crashed') {
		return {
			text: formatMessage(messages['popup.hosting.crashed']),
			class: 'text-[var(--color-red)]',
		}
	}
	if (live?.failed.value && !powerState.value) {
		return {
			text: formatMessage(messages['popup.hosting.connectionFailed']),
			class: 'text-secondary',
		}
	}
	return null
})

const suspendedNotice = computed(() => {
	switch (props.server.suspensionReason) {
		case 'cancelled':
			return formatMessage(messages['popup.hosting.notice.cancelled'])
		case 'paymentfailed':
			return formatMessage(messages['popup.hosting.notice.paymentfailed'])
		case 'moderated':
			return formatMessage(messages['popup.hosting.notice.moderated'])
		case 'upgrading':
			return formatMessage(messages['popup.hosting.notice.upgrading'])
		default:
			return formatMessage(messages['popup.hosting.notice.other'])
	}
})

function percent(used: number, total: number): number {
	return total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0
}

const resources = computed(() => {
	const stats = live?.stats.value
	const locale = i18n.global.locale.value
	// A stopped server keeps its last numbers, but it uses no CPU or memory
	const idle = !isUp.value
	const cpu = stats && !idle ? stats.cpuPercent : 0
	const ram = stats && !idle ? stats.ramUsed : 0
	const usage = (resource: string, used: number, total: number) =>
		formatMessage(messages['popup.hosting.resourceUsage'], {
			resource,
			used: formatBytes(used, locale),
			total: formatBytes(total, locale),
		})
	const cpuLabel = formatMessage(messages['popup.hosting.cpu'])
	const memoryLabel = formatMessage(messages['popup.hosting.memory'])
	const storageLabel = formatMessage(messages['popup.hosting.storage'])
	return [
		{
			key: 'cpu',
			icon: CpuIcon,
			value: stats ? `${Math.round(cpu)}%` : '–',
			tooltip: formatMessage(messages['popup.hosting.resourceValue'], {
				resource: cpuLabel,
				value: stats ? `${Math.round(cpu)}%` : '–',
			}),
			percent: Math.min(100, cpu),
		},
		{
			key: 'memory',
			icon: MemoryStickIcon,
			value: stats ? formatBytes(ram, locale) : '–',
			tooltip: stats ? usage(memoryLabel, ram, stats.ramTotal) : memoryLabel,
			percent: stats ? percent(ram, stats.ramTotal) : 0,
		},
		{
			key: 'storage',
			icon: DatabaseIcon,
			value: stats ? formatBytes(stats.storageUsed, locale) : '–',
			tooltip: stats ? usage(storageLabel, stats.storageUsed, stats.storageTotal) : storageLabel,
			percent: stats ? percent(stats.storageUsed, stats.storageTotal) : 0,
		},
	]
})

// Same format as the website's uptime label
function formatUptime(totalSeconds: number): string {
	const days = Math.floor(totalSeconds / 86_400)
	const hours = Math.floor((totalSeconds % 86_400) / 3600)
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const seconds = totalSeconds % 60
	return [days > 0 && `${days}d`, (hours > 0 || days > 0) && `${hours}h`, `${minutes}m ${seconds}s`]
		.filter(Boolean)
		.join(' ')
}

// Counts up between the uptime reports
const now = ref(Date.now())
let ticker: ReturnType<typeof setInterval> | undefined
watch(
	() => live?.uptime.value,
	(uptime) => {
		if (ticker) clearInterval(ticker)
		ticker = uptime ? setInterval(() => (now.value = Date.now()), 1000) : undefined
	},
	{ immediate: true },
)
onBeforeUnmount(() => {
	if (ticker) clearInterval(ticker)
})

const uptimeSeconds = computed(() => {
	const uptime = live?.uptime.value
	if (!uptime || !isUp.value) return undefined
	return uptime.seconds + Math.max(0, Math.floor((now.value - uptime.at) / 1000))
})

const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined

async function copyAddress() {
	try {
		await navigator.clipboard.writeText(props.server.address)
		copied.value = true
		clearTimeout(copiedTimer)
		copiedTimer = setTimeout(() => (copied.value = false), 1500)
	} catch (err) {
		console.error('[Modrinth Extras] Hosting: Failed to copy the server address:', err)
	}
}
</script>
