const MAX_ENCODED_IDS_LENGTH = 6_000

export function chunkIdsForQuery(ids: string[]): string[][] {
	const chunks: string[][] = []
	let chunk: string[] = []
	let encodedLength = 6 // Encoded JSON brackets: %5B and %5D

	for (const id of ids) {
		const idLength = encodeURIComponent(JSON.stringify(id)).length
		const separatorLength = chunk.length > 0 ? 3 : 0 // Encoded comma: %2C
		if (chunk.length > 0 && encodedLength + separatorLength + idLength > MAX_ENCODED_IDS_LENGTH) {
			chunks.push(chunk)
			chunk = []
			encodedLength = 6
		}
		chunk.push(id)
		encodedLength += (chunk.length > 1 ? 3 : 0) + idLength
	}

	if (chunk.length > 0) chunks.push(chunk)
	return chunks
}
