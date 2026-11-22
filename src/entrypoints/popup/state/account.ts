import { ref } from 'vue'

import { type Account, accountItem } from '../../../features/account/account'

// Kept up to date by the background, the popup only shows it
export const account = ref<Account | null>(null)
export const accountLoaded = ref(false)

accountItem.watch((value) => {
	account.value = value
})

export async function loadAccount() {
	try {
		account.value = await accountItem.getValue()
	} catch (err) {
		console.error('[Modrinth Extras] Failed to load the signed in account:', err)
	} finally {
		accountLoaded.value = true
	}
}
