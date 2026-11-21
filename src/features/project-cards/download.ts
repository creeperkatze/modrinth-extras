import type { Labrinth } from '@modrinth/api-client'

import { saveBlob } from '../../utils/download'

export async function saveFiles(files: Labrinth.Versions.v3.VersionFile[]) {
	const blobs = await Promise.all(
		files.map(async (file) => {
			const response = await fetch(file.url)
			if (!response.ok) throw new Error(`Failed to fetch ${file.url}: ${response.status}`)
			return { filename: file.filename, blob: await response.blob() }
		}),
	)
	for (const { filename, blob } of blobs) saveBlob(blob, filename)
}
