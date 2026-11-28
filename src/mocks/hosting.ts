/* oxlint-disable typescript/no-explicit-any */
import {
	AbstractFeature,
	type Archon,
	ModrinthApiError,
	type RequestContext,
} from '@modrinth/api-client'
import { storage, type WxtStorageItem } from '@wxt-dev/storage'

// Simulates Modrinth Hosting servers in place of Archon and its nodes

type Power = 'starting' | 'running' | 'stopping' | 'stopped' | 'crashed'

interface PowerEntry {
	power: Power
	since: number
	// A restart stops first and then starts again
	restart?: boolean
}

interface MockServer {
	id: string
	name: string
	status: Archon.Servers.v0.Status
	suspensionReason?: Archon.Servers.v0.SuspensionReason
	medal?: boolean
	loader: Archon.Servers.v0.Loader
	loaderVersion: string
	mcVersion: string
	modpackId?: string
	domain: string
	permissions: number
	icon?: { color: string; letter: string }
	ramGb: number
	ramUse: number
	cpuBase: number
	storageUsedGb: number
	storageTotalGb: number
	// Runs out of memory this long after it finished starting
	crashAfterMs?: number
	initial: { power: 'running' | 'stopped'; minutesAgo: number }
}

const GB = 1024 ** 3
const START_MS = 6000
const STOP_MS = 3000
const MOCK_NODE = 'mock-node.modrinth-extras.invalid'
const OWNER = 2 ** 64 - 2 ** 15
const VIEWER = 2 ** 63

const SERVERS: MockServer[] = [
	{
		id: 'mock-server-smp',
		name: 'Survival SMP',
		status: 'available',
		loader: 'Fabric',
		loaderVersion: '0.16.14',
		mcVersion: '1.21.1',
		modpackId: '1KVo5zza',
		domain: 'survival-smp',
		permissions: OWNER,
		icon: { color: '#1bd96a', letter: 'S' },
		ramGb: 8,
		ramUse: 0.62,
		cpuBase: 18,
		storageUsedGb: 6.4,
		storageTotalGb: 50,
		initial: { power: 'running', minutesAgo: 192 },
	},
	{
		id: 'mock-server-creative',
		name: 'Creative Builds',
		status: 'available',
		loader: 'Paper',
		loaderVersion: '196',
		mcVersion: '1.21.4',
		domain: 'creative-builds',
		permissions: OWNER,
		ramGb: 4,
		ramUse: 0.48,
		cpuBase: 8,
		storageUsedGb: 2.1,
		storageTotalGb: 25,
		initial: { power: 'stopped', minutesAgo: 0 },
	},
	{
		id: 'mock-server-modded',
		name: 'Modded Chaos',
		status: 'available',
		loader: 'NeoForge',
		loaderVersion: '21.1.172',
		mcVersion: '1.21.1',
		domain: 'modded-chaos',
		permissions: OWNER,
		icon: { color: '#e08325', letter: 'M' },
		ramGb: 12,
		ramUse: 0.7,
		cpuBase: 35,
		storageUsedGb: 18.7,
		storageTotalGb: 75,
		crashAfterMs: 25_000,
		initial: { power: 'stopped', minutesAgo: 0 },
	},
	{
		id: 'mock-server-friend',
		name: "Friend's Realm",
		status: 'available',
		loader: 'Vanilla',
		loaderVersion: '',
		mcVersion: '1.21.4',
		domain: 'friends-realm',
		permissions: VIEWER,
		icon: { color: '#4f9cff', letter: 'F' },
		ramGb: 6,
		ramUse: 0.4,
		cpuBase: 12,
		storageUsedGb: 3.3,
		storageTotalGb: 40,
		initial: { power: 'running', minutesAgo: 27 },
	},
	{
		id: 'mock-server-installing',
		name: 'Brand New Server',
		status: 'installing',
		loader: 'Fabric',
		loaderVersion: '0.16.14',
		mcVersion: '1.21.4',
		domain: 'brand-new',
		permissions: OWNER,
		ramGb: 4,
		ramUse: 0,
		cpuBase: 0,
		storageUsedGb: 0.2,
		storageTotalGb: 25,
		initial: { power: 'stopped', minutesAgo: 0 },
	},
	{
		id: 'mock-server-medal',
		name: 'Medal Trial',
		status: 'suspended',
		suspensionReason: 'cancelled',
		medal: true,
		loader: 'Vanilla',
		loaderVersion: '',
		mcVersion: '1.21.4',
		domain: 'medal-trial',
		permissions: OWNER,
		ramGb: 4,
		ramUse: 0,
		cpuBase: 0,
		storageUsedGb: 1.2,
		storageTotalGb: 25,
		initial: { power: 'stopped', minutesAgo: 0 },
	},
	{
		id: 'mock-server-cancelled',
		name: 'Old Hardcore',
		status: 'suspended',
		suspensionReason: 'cancelled',
		loader: 'Vanilla',
		loaderVersion: '',
		mcVersion: '1.20.4',
		domain: 'old-hardcore',
		permissions: OWNER,
		ramGb: 4,
		ramUse: 0,
		cpuBase: 0,
		storageUsedGb: 4.8,
		storageTotalGb: 25,
		initial: { power: 'stopped', minutesAgo: 0 },
	},
]

let powerItem: WxtStorageItem<Record<string, PowerEntry> | null, Record<string, unknown>> | null =
	null
let powers: Record<string, PowerEntry> | null = null

// Kept in storage so a server keeps running while the popup is closed
async function loadPowers(): Promise<Record<string, PowerEntry>> {
	if (powers) return powers
	powerItem ??= storage.defineItem<Record<string, PowerEntry> | null>('local:mockHosting', {
		defaultValue: null,
	})
	const saved = (await powerItem.getValue()) ?? {}
	powers = Object.fromEntries(
		SERVERS.map((server) => [
			server.id,
			saved[server.id] ?? {
				power: server.initial.power,
				since: Date.now() - server.initial.minutesAgo * 60_000,
			},
		]),
	)
	return powers
}

// States move on by themselves over time, so nothing has to run in the background
function resolvePower(server: MockServer, entry: PowerEntry, now = Date.now()): PowerEntry {
	let current = entry
	for (;;) {
		if (current.power === 'starting' && now - current.since >= START_MS) {
			current = { power: 'running', since: current.since + START_MS }
		} else if (current.power === 'stopping' && now - current.since >= STOP_MS) {
			current = {
				power: current.restart ? 'starting' : 'stopped',
				since: current.since + STOP_MS,
			}
		} else if (
			current.power === 'running' &&
			server.crashAfterMs &&
			now - current.since >= server.crashAfterMs
		) {
			current = { power: 'crashed', since: current.since + server.crashAfterMs }
		} else {
			return current
		}
	}
}

async function currentPower(server: MockServer): Promise<PowerEntry> {
	const all = await loadPowers()
	return resolvePower(server, all[server.id]!)
}

async function applyPowerAction(server: MockServer, action: string) {
	const all = await loadPowers()
	const entry = resolvePower(server, all[server.id]!)
	const now = Date.now()
	const up = entry.power === 'running' || entry.power === 'starting'
	if (action === 'Start' && !up && entry.power !== 'stopping') {
		all[server.id] = { power: 'starting', since: now }
	} else if (action === 'Stop' && up) {
		all[server.id] = { power: 'stopping', since: now }
	} else if (action === 'Restart' && up) {
		all[server.id] = { power: 'stopping', since: now, restart: true }
	} else if (action === 'Kill' && entry.power !== 'stopped' && entry.power !== 'crashed') {
		all[server.id] = { power: 'stopped', since: now }
	} else {
		throw new ModrinthApiError(`Can't ${action.toLowerCase()} while ${entry.power}`, {
			statusCode: 409,
			context: server.id,
		})
	}
	await powerItem!.setValue(all)
}

function toArchonServer(server: MockServer): Archon.Servers.v0.Server {
	return {
		server_id: server.id,
		name: server.name,
		owner_id: 'mock-owner',
		net: { ip: '203.0.113.10', port: 25565, domain: server.domain },
		game: 'Minecraft',
		backup_quota: 15,
		used_backup_quota: 3,
		status: server.status,
		suspension_reason: server.suspensionReason ?? null,
		loader: server.loader,
		loader_version: server.loaderVersion || null,
		mc_version: server.mcVersion,
		upstream: server.modpackId
			? { kind: 'modpack', project_id: server.modpackId, version_id: 'mock-version' }
			: null,
		sftp_username: 'mock',
		sftp_password: 'mock',
		sftp_host: MOCK_NODE,
		datacenter: 'mock',
		notices: [],
		node: { token: 'mock', instance: MOCK_NODE },
		flows: { intro: false },
		is_medal: !!server.medal,
		current_user_permissions: server.permissions,
		locked_since: null,
		icon: server.icon ? { hash: `mock-${server.id}`, config: null } : null,
	} as Archon.Servers.v0.Server
}

async function drawIcon(icon: { color: string; letter: string }): Promise<Blob> {
	const canvas = new OffscreenCanvas(64, 64)
	const context = canvas.getContext('2d')!
	context.fillStyle = icon.color
	context.fillRect(0, 0, 64, 64)
	context.fillStyle = '#ffffff'
	context.font = 'bold 36px sans-serif'
	context.textAlign = 'center'
	context.textBaseline = 'middle'
	context.fillText(icon.letter, 32, 34)
	return canvas.convertToBlob({ type: 'image/png' })
}

function stats(server: MockServer, entry: PowerEntry, now: number) {
	const seconds = now / 1000
	const wave = (period: number) => (Math.sin(seconds / period) + 1) / 2
	const ramTotal = server.ramGb * GB
	let cpu = 0
	let ram = 0
	if (entry.power === 'starting') {
		const progress = Math.min(1, (now - entry.since) / START_MS)
		cpu = 70 + Math.random() * 30
		ram = ramTotal * (0.1 + server.ramUse * progress)
	} else if (entry.power === 'running') {
		cpu = Math.min(100, server.cpuBase + 25 * wave(7) + Math.random() * 8)
		ram = ramTotal * (server.ramUse + 0.05 * wave(23))
		// A crashing server fills its memory first
		if (server.crashAfterMs) {
			const progress = Math.min(1, (now - entry.since) / server.crashAfterMs)
			ram = ramTotal * (server.ramUse + (0.99 - server.ramUse) * progress)
			cpu = Math.min(100, cpu + 50 * progress)
		}
	} else if (entry.power === 'stopping') {
		const progress = Math.min(1, (now - entry.since) / STOP_MS)
		cpu = 20 + Math.random() * 10
		ram = ramTotal * server.ramUse * (1 - progress)
	}
	return {
		event: 'stats',
		cpu_percent: cpu,
		ram_usage_bytes: ram,
		ram_total_bytes: ramTotal,
		storage_usage_bytes: server.storageUsedGb * GB,
		storage_total_bytes: server.storageTotalGb * GB,
	}
}

function stateEvent(entry: PowerEntry, now: number) {
	const variant = entry.power === 'stopped' || entry.power === 'crashed' ? 'idle' : entry.power
	return {
		event: 'state',
		debug: 'mock',
		power_variant: variant,
		exit_code: entry.power === 'crashed' ? 137 : 0,
		was_oom: entry.power === 'crashed',
		target: null,
		uptime: entry.power === 'running' ? Math.floor((now - entry.since) / 1000) : 0,
		progress: null,
		content_error: null,
	}
}

// Speaks the node protocol: auth, then a state event and stats every second
class MockWebSocket {
	static readonly CONNECTING = 0
	static readonly OPEN = 1
	static readonly CLOSING = 2
	static readonly CLOSED = 3

	readonly url: string
	readyState = MockWebSocket.CONNECTING
	binaryType = 'blob'
	protocol = ''
	extensions = ''
	bufferedAmount = 0
	onopen: ((event: Event) => void) | null = null
	onmessage: ((event: MessageEvent) => void) | null = null
	onclose: ((event: CloseEvent) => void) | null = null
	onerror: ((event: Event) => void) | null = null

	private server: MockServer | undefined
	private timer: ReturnType<typeof setInterval> | undefined
	private lastPower: Power | null = null

	constructor(url: string) {
		this.url = url
		this.server = SERVERS.find((s) => s.id === new URL(url).searchParams.get('server'))
		setTimeout(
			() => {
				if (this.readyState !== MockWebSocket.CONNECTING) return
				this.readyState = MockWebSocket.OPEN
				this.onopen?.(new Event('open'))
			},
			150 + Math.random() * 200,
		)
	}

	send(data: string) {
		const message = JSON.parse(data) as { event: string; jwt?: string }
		if (message.event !== 'auth') return
		if (!this.server || message.jwt !== `mock-token-${this.server.id}`) {
			this.emit({ event: 'auth-incorrect' })
			return
		}
		this.emit({ event: 'auth-ok' })
		void this.tick(true)
		clearInterval(this.timer)
		this.timer = setInterval(() => void this.tick(false), 1000)
	}

	close(code = 1000, reason = '') {
		if (this.readyState >= MockWebSocket.CLOSING) return
		this.readyState = MockWebSocket.CLOSING
		clearInterval(this.timer)
		setTimeout(() => {
			this.readyState = MockWebSocket.CLOSED
			this.onclose?.(new CloseEvent('close', { code, reason, wasClean: true }))
		}, 0)
	}

	addEventListener() {}
	removeEventListener() {}

	private emit(event: object) {
		if (this.readyState !== MockWebSocket.OPEN) return
		this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(event) }))
	}

	private async tick(initial: boolean) {
		const server = this.server
		if (!server || this.readyState !== MockWebSocket.OPEN) return
		const entry = await currentPower(server)
		const now = Date.now()
		if (initial) {
			this.emit(stateEvent(entry, now))
		} else if (entry.power !== this.lastPower) {
			this.emit({
				event: 'power-state',
				state: entry.power,
				...(entry.power === 'crashed' ? { oom_killed: true, exit_code: 137 } : {}),
			})
			if (entry.power === 'running') {
				this.emit({ event: 'uptime', uptime: Math.floor((now - entry.since) / 1000) })
			}
		}
		this.lastPower = entry.power
		this.emit(stats(server, entry, now))
	}
}

function installMockWebSocket() {
	const RealWebSocket = globalThis.WebSocket
	if (!RealWebSocket || (RealWebSocket as any).isMockWrapper) return
	function WebSocketWithMock(url: string | URL, protocols?: string | string[]) {
		return String(url).includes(MOCK_NODE)
			? new MockWebSocket(String(url))
			: new RealWebSocket(url, protocols)
	}
	Object.assign(WebSocketWithMock, {
		CONNECTING: 0,
		OPEN: 1,
		CLOSING: 2,
		CLOSED: 3,
		isMockWrapper: true,
	})
	globalThis.WebSocket = WebSocketWithMock as unknown as typeof WebSocket
}

function wait() {
	return new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300))
}

// Answers the hosting routes in place of Archon
export class MockHostingFeature extends AbstractFeature {
	constructor() {
		super({ name: 'mock-hosting' })
		installMockWebSocket()
	}

	async execute<T>(next: () => Promise<T>, context: RequestContext): Promise<T> {
		if (context.options.api !== 'archon') return next()
		const method = context.options.method ?? 'GET'
		const [pathname = ''] = context.path.replace(/^\/?/, '/').split('?')

		if (method === 'GET' && pathname === '/servers') {
			await wait()
			if (context.options.version === 1) return [] as T
			return {
				servers: SERVERS.map(toArchonServer),
				pagination: {
					current_page: 1,
					page_size: 100,
					total_pages: 1,
					total_items: SERVERS.length,
				},
				users: {},
			} as T
		}

		const match = pathname.match(/^\/servers\/([^/]+)(\/.*)?$/)
		const server = SERVERS.find((s) => s.id === match?.[1])
		if (!match || !server) return next()
		const route = match[2] ?? ''

		await wait()
		if (route === '' && method === 'GET') return toArchonServer(server) as T
		if (route === '/icon' && method === 'GET') {
			if (!server.icon) throw new ModrinthApiError('Not found', { statusCode: 404, context: route })
			return (await drawIcon(server.icon)) as T
		}
		if (route === '/ws' && method === 'GET') {
			return {
				url: `wss://${MOCK_NODE}/v0/ws?server=${server.id}`,
				token: `mock-token-${server.id}`,
			} as T
		}
		if (route === '/power' && method === 'POST') {
			if (server.permissions !== OWNER) {
				throw new ModrinthApiError('Forbidden', { statusCode: 403, context: route })
			}
			const { action } = context.options.body as { action: string }
			await applyPowerAction(server, action)
			return undefined as T
		}
		return next()
	}
}
