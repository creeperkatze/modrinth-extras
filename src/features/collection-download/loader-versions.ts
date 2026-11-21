import type { ModLoader } from './collection'

// The names a .mrpack uses for each loader
export const MRPACK_LOADER_KEYS: Record<ModLoader, string> = {
	fabric: 'fabric-loader',
	quilt: 'quilt-loader',
	forge: 'forge',
	neoforge: 'neoforge',
}

interface LauncherManifest {
	gameVersions: { id: string; loaders: { id: string; stable: boolean }[] }[]
}

const META = 'https://launcher-meta.modrinth.com'
// Fabric's loader works on every game version, so the manifest lists it once under this id
const ANY_GAME_VERSION = '${modrinth.gameVersion}'

const manifests = new Map<string, Promise<LauncherManifest>>()

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url)
	if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`)
	return response.json() as Promise<T>
}

function manifest(name: string): Promise<LauncherManifest> {
	let request = manifests.get(name)
	if (!request) {
		request = fetchJson<LauncherManifest>(`${META}/${name}/v0/manifest.json`)
		request.catch(() => manifests.delete(name))
		manifests.set(name, request)
	}
	return request
}

// The same lists the Modrinth App picks loader versions from, newest first
export async function latestLoaderVersion(
	loader: ModLoader,
	gameVersion: string,
): Promise<string | null> {
	if (loader === 'quilt') {
		// Quilt isn't in Modrinth's launcher manifests
		const versions = await fetchJson<{ version: string }[]>(
			'https://meta.quiltmc.org/v3/versions/loader',
		)
		return versions.find((version) => !version.version.includes('-'))?.version ?? null
	}
	if (loader === 'fabric') {
		const { gameVersions } = await manifest('fabric')
		const loaders = gameVersions.find((entry) => entry.id === ANY_GAME_VERSION)?.loaders ?? []
		return loaders.find((entry) => entry.stable)?.id ?? null
	}
	const { gameVersions } = await manifest(loader === 'neoforge' ? 'neo' : 'forge')
	return gameVersions.find((entry) => entry.id === gameVersion)?.loaders[0]?.id ?? null
}
