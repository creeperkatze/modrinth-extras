export function hexToRgb(hex: string): [number, number, number] | null {
	const match = hex.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
	if (!match) return null
	return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)]
}

export function rgbToHex(r: number, g: number, b: number): string {
	const clamp = (c: number) => Math.min(255, Math.max(0, Math.round(c)))
	return `#${[clamp(r), clamp(g), clamp(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

export function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
	r /= 255
	g /= 255
	b /= 255
	const max = Math.max(r, g, b)
	const min = Math.min(r, g, b)
	const d = max - min

	let h = 0
	if (d !== 0) {
		if (max === r) h = ((g - b) / d) % 6
		else if (max === g) h = (b - r) / d + 2
		else h = (r - g) / d + 4
		h *= 60
		if (h < 0) h += 360
	}

	const s = max === 0 ? 0 : d / max
	const v = max

	return [h, s, v]
}

export function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
	const c = v * s
	const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
	const m = v - c

	const [r, g, b] =
		h < 60
			? [c, x, 0]
			: h < 120
				? [x, c, 0]
				: h < 180
					? [0, c, x]
					: h < 240
						? [0, x, c]
						: h < 300
							? [x, 0, c]
							: [c, 0, x]

	return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}
