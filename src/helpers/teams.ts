import { apiFetch } from '../helpers/apiFetch'

export async function acceptTeamInvite(teamId: string): Promise<void> {
	await apiFetch(`team/${teamId}/join`, { apiVersion: 3, method: 'POST' })
}

export async function removeSelfFromTeam(teamId: string, userId: string): Promise<void> {
	await apiFetch(`team/${teamId}/members/${userId}`, { apiVersion: 3, method: 'DELETE' })
}
