import { modrinthClient } from '../../api/client'

export interface RevenueBalance {
	available: number
	pending: number
	// Pending revenue by the date it becomes available
	dates: Record<string, number>
}

export interface UpcomingPayout {
	date: string
	amount: number
}

const DAYS_UNTIL_AVAILABLE = 60

export async function fetchRevenueBalance(): Promise<RevenueBalance> {
	const balance = await modrinthClient.labrinth.payout_v3.getBalance()
	return { available: balance.available, pending: balance.pending, dates: balance.dates }
}

function utcMonth(date: Date): string {
	return `${date.getUTCFullYear()}-${date.getUTCMonth()}`
}

// Same split as the website's revenue page. Revenue becomes available 60 days after the end
// of the month it was earned in, so the payout earned this month is still being processed.
export function splitPendingRevenue(
	balance: RevenueBalance,
	now = new Date(),
): { processing: UpcomingPayout | null; estimated: UpcomingPayout[] } {
	const upcoming = Object.entries(balance.dates)
		.map(([date, amount]) => ({ date, amount: Number(amount) }))
		.filter(({ date }) => new Date(date).getTime() > now.getTime())
		.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

	const processing =
		upcoming.find(({ date }) => {
			const earned = new Date(new Date(date).getTime() - DAYS_UNTIL_AVAILABLE * 24 * 60 * 60_000)
			return utcMonth(earned) === utcMonth(now)
		}) ?? null

	return {
		processing,
		estimated: upcoming.filter((payout) => payout !== processing),
	}
}
