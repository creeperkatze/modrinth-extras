import type { MetricKind } from '../../../../features/creator/analytics'

// Ported from the axis formatting of Modrinth's analytics dashboard

const COMPACT_AXIS_UNITS = [
	{ threshold: 1_000_000, divisor: 1_000_000, suffix: 'M' },
	{ threshold: 1_000, divisor: 1_000, suffix: 'K' },
] as const
const MAX_COMPACT_AXIS_DIGITS = 3

function trimTrailingFractionZeros(value: string): string {
	return value.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '')
}

function formatSmallAxisNumber(value: number): string {
	const rounded = Math.round(value)
	if (Math.abs(value - rounded) < 0.0000001) return String(rounded)
	const formattedValue = Math.abs(value) < 1 ? value.toFixed(2) : value.toFixed(1)
	return trimTrailingFractionZeros(formattedValue)
}

function getCompactAxisUnit(values: readonly number[]) {
	let maxAbsoluteValue = 0
	for (const value of values) {
		if (Number.isFinite(value)) maxAbsoluteValue = Math.max(maxAbsoluteValue, Math.abs(value))
	}
	return COMPACT_AXIS_UNITS.find((unit) => maxAbsoluteValue >= unit.threshold) ?? null
}

function formatCompactAxisValue(value: number): string {
	const absoluteValue = Math.abs(value)
	if (absoluteValue === 0) return '0'

	const integerDigitCount = absoluteValue < 1 ? 1 : Math.floor(absoluteValue).toString().length
	const fractionDigitCount = Math.max(0, MAX_COMPACT_AXIS_DIGITS - integerDigitCount)
	const roundedValue = Number(value.toFixed(fractionDigitCount))
	const roundedIntegerDigitCount =
		Math.abs(roundedValue) < 1 ? 1 : Math.floor(Math.abs(roundedValue)).toString().length

	if (roundedIntegerDigitCount > MAX_COMPACT_AXIS_DIGITS) {
		return String(Math.sign(value) * (10 ** MAX_COMPACT_AXIS_DIGITS - 1))
	}
	return trimTrailingFractionZeros(roundedValue.toFixed(fractionDigitCount))
}

function formatCompactAxisNumber(value: number, axisValues: readonly number[]): string | null {
	if (Math.abs(value) === 0) return '0'
	const unit = getCompactAxisUnit(axisValues)
	if (!unit) return null
	return `${formatCompactAxisValue(value / unit.divisor)}${unit.suffix}`
}

export function formatAxisValue(
	value: number,
	metric: MetricKind,
	formatCompact: (value: number) => string,
	axisValues: readonly number[] = [value],
): string {
	if (metric === 'revenue') {
		const amount = Math.round(value * 100) / 100
		const axisAmounts = axisValues.map((axisValue) => Math.round(axisValue * 100) / 100)
		return `$${formatCompactAxisNumber(amount, axisAmounts) ?? formatCompact(amount)}`
	}

	const roundedValue = Math.round(value)
	const roundedAxisValues = axisValues.map((axisValue) => Math.round(axisValue))
	const formattedValue = formatCompactAxisNumber(roundedValue, roundedAxisValues)
	if (formattedValue) return formattedValue
	if (Math.abs(value) < 10) return formatSmallAxisNumber(value)
	return formatCompact(roundedValue)
}
