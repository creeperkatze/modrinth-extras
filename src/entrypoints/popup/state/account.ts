import { ModrinthApiError } from '@modrinth/api-client'
import { storage } from '@wxt-dev/storage'
import { ref } from 'vue'

import { getBackgroundAuthToken, modrinthClient } from '../../../api/client'

export interface Account {
	id: string
	username: string
	avatarUrl: string | null
}

export const account = ref<Account | null>(null)
export const accountLoaded = ref(false)

const accountItem = storage.defineItem<Account | null>('local:popupAccount', {
	defaultValue: null,
})

export async function loadAccount() {
	try {
		const token = await getBackgroundAuthToken()
		if (!token) {
			account.value = null
			await accountItem.setValue(null)
			return
		}

		// The account from last time is shown while it is checked again
		account.value = await accountItem.getValue()
		if (account.value) accountLoaded.value = true

		const user = await modrinthClient.labrinth.users_v3.getAuthenticated()
		account.value = { id: user.id, username: user.username, avatarUrl: user.avatar_url ?? null }
		await accountItem.setValue(account.value)
	} catch (err) {
		if (err instanceof ModrinthApiError && err.statusCode === 401) {
			account.value = null
			await accountItem.setValue(null)
		} else {
			console.error('[Modrinth Extras] Failed to load the signed in account:', err)
		}
	} finally {
		accountLoaded.value = true
	}
}
