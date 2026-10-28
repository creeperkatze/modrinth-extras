// Passing two file IDs opens modsrc's diff between them.
export function modsrcUrl(projectId: string, ...fileIds: string[]): string {
	return `https://modsrc.dev/1/${[projectId, ...fileIds].map(encodeURIComponent).join('/')}`
}

export function slicerUrl(fileUrl: string): string {
	return `https://slicer.run/?url=${encodeURIComponent(fileUrl)}`
}
