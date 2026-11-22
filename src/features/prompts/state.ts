import { storage } from '@wxt-dev/storage'

interface PromptState {
	dismissed: boolean
	// Missing for people who installed before it was saved
	installedAt?: number
}

const DAY = 24 * 60 * 60 * 1000

export const donatePrompt = {
	item: storage.defineItem<PromptState>('sync:donatePrompt'),
	delay: 3 * DAY,
}

export const discordPrompt = {
	item: storage.defineItem<PromptState>('sync:discordPrompt'),
	delay: 7 * DAY,
}

type Prompt = typeof donatePrompt

const PROMPTS = [donatePrompt, discordPrompt]

// Another browser may have saved an earlier one
export async function saveInstallDate() {
	for (const { item } of PROMPTS) {
		if (!(await item.getValue())) await item.setValue({ dismissed: false, installedAt: Date.now() })
	}
}

export async function shouldShowPrompt({ item, delay }: Prompt): Promise<boolean> {
	const state = await item.getValue()
	if (state?.dismissed) return false
	return !state?.installedAt || Date.now() - state.installedAt >= delay
}

export async function dismissPrompt({ item }: Prompt) {
	await item.setValue({ dismissed: true })
}

// Only a dismissal is copied, so one from another browser is never undone
export async function movePromptsToSync() {
	for (const { item } of PROMPTS) {
		const localKey = item.key.replace('sync:', 'local:') as `local:${string}`
		const old = await storage.getItem<PromptState>(localKey)
		if (!old) continue
		if (old.dismissed) await item.setValue(old)
		await storage.removeItem(localKey)
	}
}
