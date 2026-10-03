import { browser } from 'wxt/browser'

const COOKIE_URL = 'https://modrinth.com'
const COOKIE_NAME = 'featureFlags'

// Mirrors DEFAULT_FEATURE_FLAGS in modrinth/apps/frontend/src/composables/featureFlags.ts
export const MODRINTH_FLAG_DEFAULTS = {
	searchBackground: false,
	projectTypesPrimaryNav: false,
} as const

export type ModrinthFlagKey = keyof typeof MODRINTH_FLAG_DEFAULTS

async function readFlagsCookie(): Promise<Record<string, boolean>> {
	try {
		const cookie = await browser.cookies.get({ url: COOKIE_URL, name: COOKIE_NAME })
		if (!cookie?.value) return {}
		return JSON.parse(decodeURIComponent(cookie.value))
	} catch (err) {
		console.error('[Modrinth Extras] Flags: Failed to read feature flags cookie:', err)
		return {}
	}
}

async function writeFlagsCookie(flags: Record<string, boolean>): Promise<void> {
	try {
		await browser.cookies.set({
			url: COOKIE_URL,
			name: COOKIE_NAME,
			value: encodeURIComponent(JSON.stringify(flags)),
			path: '/',
			sameSite: 'lax',
			secure: true,
			expirationDate: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 365 * 10,
		})
	} catch (err) {
		console.error('[Modrinth Extras] Flags: Failed to write feature flags cookie:', err)
	}
}

export async function getModrinthFlags(): Promise<Record<ModrinthFlagKey, boolean>> {
	const saved = await readFlagsCookie()
	const flags = {} as Record<ModrinthFlagKey, boolean>
	for (const key of Object.keys(MODRINTH_FLAG_DEFAULTS) as ModrinthFlagKey[]) {
		flags[key] = key in saved ? Boolean(saved[key]) : MODRINTH_FLAG_DEFAULTS[key]
	}
	return flags
}

export async function setModrinthFlag(key: ModrinthFlagKey, value: boolean): Promise<void> {
	const flags = await readFlagsCookie()
	flags[key] = value
	await writeFlagsCookie(flags)
}
