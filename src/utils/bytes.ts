const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte', 'terabyte'] as const

export function formatBytes(bytes: number, locale?: string): string {
	let value = Math.max(0, bytes)
	let unit = 0
	while (value >= 1024 && unit < UNITS.length - 1) {
		value /= 1024
		unit++
	}
	return new Intl.NumberFormat(locale, {
		style: 'unit',
		unit: UNITS[unit],
		unitDisplay: 'short',
		maximumFractionDigits: unit > 0 && value < 10 ? 1 : 0,
	}).format(value)
}
