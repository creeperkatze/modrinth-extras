import type { Labrinth } from '@modrinth/api-client'

export async function saveFiles(files: Labrinth.Versions.v3.VersionFile[]) {
	const blobs = await Promise.all(
		files.map(async (file) => {
			const response = await fetch(file.url)
			if (!response.ok) throw new Error(`Failed to fetch ${file.url}: ${response.status}`)
			return { filename: file.filename, blob: await response.blob() }
		}),
	)

	// Saved as blobs since opening several download URLs in a row cancels all but the last
	for (const { filename, blob } of blobs) {
		const url = URL.createObjectURL(blob)
		const anchor = document.createElement('a')
		anchor.href = url
		anchor.download = filename
		anchor.style.display = 'none'
		document.body.appendChild(anchor)
		anchor.click()
		anchor.remove()
		setTimeout(() => URL.revokeObjectURL(url), 60_000)
	}
}
