import type { Archon } from '@modrinth/api-client'
import {
	getHostingServerAddress,
	hasAvailableWorldDownload,
	hasServerPermission,
	isWithinServerResubscribeWindow,
} from '@modrinth/ui'

import { modrinthClient } from '../../api/client'
import { readAsDataUrl } from '../../utils/blob'

export interface HostingServer {
	id: string
	name: string
	status: Archon.Servers.v0.Status
	suspensionReason: Archon.Servers.v0.SuspensionReason | null
	game: Archon.Servers.v0.Game
	mcVersion: string | null
	loader: Archon.Servers.v0.Loader | null
	loaderVersion: string | null
	address: string
	iconUrl: string | null
	canUsePowerActions: boolean
	// A free Medal trial server
	isMedal: boolean
}

// Matches the website's server list limit
const SERVER_LIMIT = 100

// Icons are small, so they're kept inline and the cached list shows them right away
async function fetchIcon(serverId: string): Promise<string | null> {
	try {
		return await readAsDataUrl(await modrinthClient.archon.icons_v1.get(serverId))
	} catch (err) {
		console.error('[Modrinth Extras] Hosting: Failed to fetch a server icon:', err)
		return null
	}
}

// When each cancelled server's subscription ended, keyed by server ID
async function fetchCancellationDates(): Promise<Map<string, string>> {
	const [subscriptions, charges] = await Promise.all([
		modrinthClient.labrinth.billing_internal.getSubscriptions(),
		modrinthClient.labrinth.billing_internal.getPayments(),
	])
	const dates = new Map<string, string>()
	for (const subscription of subscriptions) {
		if (subscription.metadata?.type !== 'pyro') continue
		const serverId = (subscription.metadata as { id?: string }).id
		if (!serverId) continue
		const charge = charges.find(
			(c) => c.subscription_id === subscription.id && c.status !== 'succeeded',
		)
		if (charge?.status === 'cancelled') dates.set(serverId, charge.due)
	}
	return dates
}

// Same rule as the website: a cancelled server stays while it can be resubscribed or its world downloaded
async function withoutExpired(
	servers: Archon.Servers.v0.Server[],
): Promise<Archon.Servers.v0.Server[]> {
	const isCancelled = (server: Archon.Servers.v0.Server) =>
		server.status === 'suspended' && server.suspension_reason === 'cancelled'
	if (!servers.some(isCancelled)) return servers
	try {
		const [dates, fullServers] = await Promise.all([
			fetchCancellationDates(),
			modrinthClient.archon.servers_v1.list(),
		])
		return servers.filter((server) => {
			const cancelledAt = dates.get(server.server_id)
			if (!isCancelled(server) || !cancelledAt) return true
			return (
				isWithinServerResubscribeWindow(cancelledAt) ||
				hasAvailableWorldDownload(server.server_id, fullServers)
			)
		})
	} catch (err) {
		console.error('[Modrinth Extras] Hosting: Failed to check the cancelled servers:', err)
		return servers
	}
}

export async function fetchHostingServers(): Promise<HostingServer[]> {
	const { servers: allServers } = await modrinthClient.archon.servers_v0.list({
		limit: SERVER_LIMIT,
	})
	const servers = await withoutExpired(allServers)
	const icons = await Promise.all(
		servers.map((server) => (server.icon ? fetchIcon(server.server_id) : null)),
	)

	return servers
		.map((server, index) => {
			return {
				id: server.server_id,
				name: server.name,
				status: server.status,
				suspensionReason: server.suspension_reason,
				game: server.game,
				mcVersion: server.mc_version,
				loader: server.loader,
				loaderVersion: server.loader_version,
				address: getHostingServerAddress(server.net),
				iconUrl: icons[index] ?? null,
				canUsePowerActions: hasServerPermission(server.current_user_permissions, 'POWER_ACTIONS'),
				isMedal: server.is_medal,
			}
		})
		.sort(
			(a, b) =>
				Number(a.status === 'suspended') - Number(b.status === 'suspended') ||
				a.name.localeCompare(b.name),
		)
}
