import { strToU8, type Zippable, zipSync } from 'fflate'

import { slugify } from '../../utils/strings'
import { KIND_FOLDERS, type Selection } from './collection'
import { latestLoaderVersion, MRPACK_LOADER_KEYS } from './loader-versions'
import type { ResolvedEntry } from './resolve'

export type ExportFormat = 'mrpack' | 'zip'

const DOWNLOAD_CONCURRENCY = 4

function entryPath(entry: ResolvedEntry): string {
	return `${KIND_FOLDERS[entry.kind]}/${entry.file.filename}`
}

export function exportFileName(name: string, format: ExportFormat): string {
	return `${slugify(name, 'collection')}.${format}`
}

export class MissingLoaderVersionError extends Error {}

// fflate always returns a plain ArrayBuffer, its types just allow a shared one too
function zipBytes(data: Uint8Array): Uint8Array<ArrayBuffer> {
	return data as Uint8Array<ArrayBuffer>
}

// Launchers download the files themselves, so the pack only lists them with their hashes
export async function buildMrpack(
	name: string,
	selection: Selection,
	entries: ResolvedEntry[],
): Promise<Blob> {
	const dependencies: Record<string, string> = { minecraft: selection.gameVersion }
	if (entries.some((entry) => entry.kind === 'mod')) {
		const loaderVersion = await latestLoaderVersion(selection.loader, selection.gameVersion)
		if (!loaderVersion) throw new MissingLoaderVersionError(selection.loader)
		dependencies[MRPACK_LOADER_KEYS[selection.loader]] = loaderVersion
	}
	const index = {
		formatVersion: 1,
		game: 'minecraft',
		versionId: '1.0.0',
		name,
		files: entries.map((entry) => ({
			path: entryPath(entry),
			hashes: { sha1: entry.file.hashes.sha1, sha512: entry.file.hashes.sha512 },
			downloads: [entry.file.url],
			fileSize: entry.file.size,
		})),
		dependencies,
	}
	const data = zipSync({ 'modrinth.index.json': strToU8(JSON.stringify(index, null, '\t')) })
	return new Blob([zipBytes(data)], { type: 'application/x-modrinth-modpack+zip' })
}

// The files are already compressed, so they are only stored
export async function buildZip(
	entries: ResolvedEntry[],
	onProgress: (done: number) => void,
): Promise<Blob> {
	const files: Zippable = {}
	let done = 0
	let next = 0
	async function worker() {
		while (next < entries.length) {
			const entry = entries[next++]!
			const response = await fetch(entry.file.url)
			if (!response.ok) throw new Error(`Failed to fetch ${entry.file.url}: ${response.status}`)
			files[entryPath(entry)] = [new Uint8Array(await response.arrayBuffer()), { level: 0 }]
			onProgress(++done)
		}
	}
	await Promise.all(Array.from({ length: DOWNLOAD_CONCURRENCY }, worker))
	return new Blob([zipBytes(zipSync(files))], { type: 'application/zip' })
}
