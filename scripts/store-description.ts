import { execSync } from 'child_process'
import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { showcase } from '../website/src/showcase'

const directory = dirname(fileURLToPath(import.meta.url))
const localesDirectory = resolve(directory, '../src/locales')
const websiteLocalesDirectory = resolve(directory, '../website/src/locales')

const language =
	process.argv.find(
		(a) => !a.startsWith('--') && !a.includes('node') && !a.includes('store-desc'),
	) ?? 'en-US'

const markdown = process.argv.includes('--markdown')
const summary = process.argv.includes('--summary')

type MessageFile = Record<string, { defaultMessage?: string }>
type Messages = Record<string, string>

function readJson<T>(path: string): T | undefined {
	if (!existsSync(path)) return undefined
	return JSON.parse(readFileSync(path, 'utf8')) as T
}

function loadMessages(locale: string, file: string): Messages {
	const en = readJson<MessageFile>(resolve(localesDirectory, 'en-US', `${file}.json`)) ?? {}
	const local = readJson<MessageFile>(resolve(localesDirectory, locale, `${file}.json`)) ?? {}
	const merged: Messages = {}
	for (const key of Object.keys(en)) {
		merged[key] = (local[key]?.defaultMessage || en[key]?.defaultMessage) ?? ''
	}
	return merged
}

type Highlight = { title?: string; description?: string }
type WebsiteMessages = { meta?: { feature?: Record<string, Highlight> } }

function loadHighlights(locale: string): Record<string, Highlight> {
	const path = (name: string) => resolve(websiteLocalesDirectory, `${name}.json`)
	const en = readJson<WebsiteMessages>(path('en-US'))?.meta?.feature ?? {}
	const local = readJson<WebsiteMessages>(path(locale))?.meta?.feature ?? {}
	return Object.fromEntries(
		Object.keys(en).map((key) => [
			key,
			{
				title: local[key]?.title || en[key]?.title,
				description: local[key]?.description || en[key]?.description,
			},
		]),
	)
}

const meta = loadMessages(language, 'meta')
const highlights = loadHighlights(language)
const t = (key: string) => meta[key] ?? ''

// Backticks mark inline code on the website, which plain text stores can't show
function inlineCode(text: string): string {
	return markdown ? text : text.replace(/`([^`]+)`/g, '$1')
}

const highlightBlocks = showcase.map(({ key, emoji }) => {
	const { title = '', description = '' } = highlights[key] ?? {}
	if (!title || !description) console.warn(`Missing highlight text for "${key}".`)
	return `${emoji} ${markdown ? `**${title}**` : title}\n${inlineCode(description)}`
})

const REPO_URL = 'https://github.com/creeperkatze/modrinth-extras'
const footer = t('meta.description.footer').replace(
	/<link>(.*?)<\/link>[。.。]?/,
	(_, text: string) => (markdown ? `[${text}](${REPO_URL})` : `${text}: ${REPO_URL}`),
)

const description = [
	summary ? t('meta.summary') : null,
	...highlightBlocks,
	`✨ ${t('meta.description.more')}`,
	footer,
	t('meta.description.disclaimer'),
]
	.filter((block) => block !== null)
	.join('\n\n')

console.log(description)
try {
	const platform = process.platform
	if (platform === 'win32') {
		const tmp = join(tmpdir(), `store-description-${Date.now()}.txt`)
		writeFileSync(tmp, description, 'utf8')
		try {
			execSync(
				`powershell -NoProfile -Command "Get-Content -Encoding UTF8 -Raw -Path '${tmp}' | Set-Clipboard"`,
			)
		} finally {
			unlinkSync(tmp)
		}
	} else if (platform === 'darwin') {
		execSync('pbcopy', { input: description })
	} else {
		execSync('xclip -selection clipboard || xsel --clipboard --input', {
			input: description,
			shell: true,
		})
	}
	console.error('Copied to clipboard.')
} catch {
	console.error('Could not copy to clipboard.')
}
