export function hexToRgb(hex: string): [number, number, number] | null {
	const match = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
	if (!match) return null
	return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)]
}
