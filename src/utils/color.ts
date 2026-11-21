import { type Colord, colord } from 'colord'

// The color as an rgba() string with the given opacity
export function rgba(color: string | Colord, alpha: number): string {
	return (typeof color === 'string' ? colord(color) : color).alpha(alpha).toRgbString()
}

// Keeps the given amount of the color and fills the rest with a gray, from 0 for black to 255 for white
export function mix(color: Colord, gray: number, amount: number): Colord {
	const { r, g, b } = color.toRgb()
	const channel = (c: number) => Math.round(c * amount + gray * (1 - amount))
	return colord({ r: channel(r), g: channel(g), b: channel(b) })
}
