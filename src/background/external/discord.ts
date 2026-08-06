export interface DiscordInviteData {
	name: string
	description: string | null
	iconUrl: string | null
	approximate_member_count: number
	approximate_presence_count: number
	partnered: boolean
}

export async function fetchDiscordInvite(code: string): Promise<DiscordInviteData> {
	const res = await fetch(`https://discord.com/api/v9/invites/${code}?with_counts=true`)
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as { message?: string } | null
		throw new Error(body?.message ?? res.statusText)
	}

	const data = (await res.json()) as {
		approximate_member_count: number
		approximate_presence_count: number
		guild: {
			id: string
			name: string
			description: string | null
			icon: string | null
			features: string[]
		}
	}
	const { guild } = data
	const features = guild?.features ?? []

	return {
		name: guild.name,
		description: guild.description ?? null,
		iconUrl: guild.icon
			? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.webp?size=64`
			: null,
		approximate_member_count: data.approximate_member_count ?? 0,
		approximate_presence_count: data.approximate_presence_count ?? 0,
		partnered: features.includes('PARTNERED'),
	}
}
