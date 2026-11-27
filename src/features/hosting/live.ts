import type { Archon } from '@modrinth/api-client'
import { onScopeDispose, ref, shallowRef } from 'vue'

import { modrinthClient } from '../../api/client'

export type PowerState = Archon.Websocket.v0.PowerState
export type PowerAction = 'Start' | 'Stop' | 'Restart'

export interface ServerStats {
	cpuPercent: number
	ramUsed: number
	ramTotal: number
	storageUsed: number
	storageTotal: number
}

// Same mapping as the website's dashboard
function powerStateOf(event: Archon.Websocket.v0.WSStateEvent): PowerState {
	switch (event.power_variant) {
		case 'starting':
		case 'running':
		case 'stopping':
			return event.power_variant
		case 'idle':
			return event.was_oom || (event.exit_code != null && event.exit_code !== 0)
				? 'crashed'
				: 'stopped'
		default:
			return 'stopped'
	}
}

// Connects while the popup shows the server and disconnects when it closes
export function useServerLive(serverId: string) {
	const sockets = modrinthClient.archon.sockets
	const connecting = ref(true)
	const failed = ref(false)
	const powerState = ref<PowerState | null>(null)
	const stats = shallowRef<ServerStats | null>(null)
	// When the uptime was last reported, so it can keep counting locally
	const uptime = shallowRef<{ seconds: number; at: number } | null>(null)
	const pendingAction = ref<PowerAction | null>(null)
	const actionFailed = ref<PowerAction | null>(null)

	function setPowerState(state: PowerState) {
		powerState.value = state
		if (state === 'stopped' || state === 'crashed') uptime.value = null
	}

	function setUptime(seconds: number) {
		if (seconds > 0) uptime.value = { seconds, at: Date.now() }
	}

	const unsubscribers = [
		sockets.on(serverId, 'stats', (event) => {
			stats.value = {
				cpuPercent: event.cpu_percent,
				ramUsed: event.ram_usage_bytes,
				ramTotal: event.ram_total_bytes,
				storageUsed: event.storage_usage_bytes,
				storageTotal: event.storage_total_bytes,
			}
		}),
		sockets.on(serverId, 'power-state', (event) => setPowerState(event.state)),
		sockets.on(serverId, 'state', (event) => {
			setPowerState(powerStateOf(event))
			setUptime(event.uptime)
		}),
		sockets.on(serverId, 'uptime', (event) => setUptime(event.uptime)),
	]

	sockets
		.safeConnect(serverId)
		.catch((err) => {
			failed.value = true
			console.error('[Modrinth Extras] Hosting: Failed to connect to a server:', err)
		})
		.finally(() => (connecting.value = false))

	onScopeDispose(() => {
		for (const unsubscribe of unsubscribers) unsubscribe()
		sockets.disconnect(serverId)
	})

	async function sendPowerAction(action: PowerAction) {
		if (pendingAction.value) return
		pendingAction.value = action
		actionFailed.value = null
		try {
			await modrinthClient.archon.servers_v0.power(serverId, action)
		} catch (err) {
			actionFailed.value = action
			console.error(`[Modrinth Extras] Hosting: Failed to ${action.toLowerCase()} a server:`, err)
		} finally {
			pendingAction.value = null
		}
	}

	return {
		connecting,
		failed,
		powerState,
		stats,
		uptime,
		pendingAction,
		actionFailed,
		sendPowerAction,
	}
}
