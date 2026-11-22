import { ModrinthApiError } from '@modrinth/api-client'
import { storage } from '@wxt-dev/storage'

import { getBackgroundAuthToken, modrinthClient } from '../../api/client'

export interface Account {
	id: string
	username: string
	avatarUrl: string | null
}

export const accountItem = storage.defineItem<Account | null>('local:account', {
	defaultValue: null,
})

let pending: Promise<Account | null> | null = null

async function fetchAccount(): Promise<Account | null> {
	if (!(await getBackgroundAuthToken())) {
		await accountItem.setValue(null)
		return null
	}
	try {
		const user = await modrinthClient.labrinth.users_v3.getAuthenticated()
		const account = { id: user.id, username: user.username, avatarUrl: user.avatar_url ?? null }
		await accountItem.setValue(account)
		return account
	} catch (err) {
		if (!(err instanceof ModrinthApiError && err.statusCode === 401)) throw err
		await accountItem.setValue(null)
		return null
	}
}

// Run by the background, which every other context reads the saved account from.
// Other errors keep the saved account, since they don't mean the user signed out.
export function refreshAccount(): Promise<Account | null> {
	pending ??= fetchAccount().finally(() => (pending = null))
	return pending
}
