import { modrinthClient } from './api'

export async function acceptTeamInvite(teamId: string): Promise<void> {
	await modrinthClient.request(`/team/${teamId}/join`, {
		api: 'labrinth',
		version: 3,
		method: 'POST',
	})
}

export async function removeSelfFromTeam(teamId: string, userId: string): Promise<void> {
	await modrinthClient.request(`/team/${teamId}/members/${userId}`, {
		api: 'labrinth',
		version: 3,
		method: 'DELETE',
	})
}
