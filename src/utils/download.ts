// Saved through a link, since opening several download URLs in a row cancels all but the last
export function saveBlob(blob: Blob, filename: string) {
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

// "Example Name" becomes example-name
export function fileSlug(name: string, fallback: string): string {
	const slug = name
		.toLowerCase()
		.normalize('NFKD')
		.replace(/\p{Diacritic}/gu, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
	return slug || fallback
}
