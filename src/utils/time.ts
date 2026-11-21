export const DAY_MS = 24 * 60 * 60_000

export function daysBefore(date: Date | number, days: number): Date {
	return new Date(new Date(date).getTime() - days * DAY_MS)
}
