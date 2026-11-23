import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

import { showcase } from '../website/src/showcase.ts'

const locale = process.argv.slice(2).find((arg) => !arg.startsWith('--')) ?? 'en-US'
const markdown = process.argv.includes('--markdown')
const summary = process.argv.includes('--summary')

const readJson = (path: string) => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : {})

const meta = readJson('src/locales/en-US/meta.json')
const localMeta = readJson(`src/locales/${locale}/meta.json`)
const t = (key: string) => localMeta[key]?.defaultMessage || meta[key]?.defaultMessage || ''

const features = readJson('website/src/locales/en-US.json').meta.feature
const localFeatures = readJson(`website/src/locales/${locale}.json`).meta?.feature ?? {}

// Backticks mark inline code on the website, which plain text stores can't show
const inlineCode = (text: string) => (markdown ? text : text.replace(/`([^`]+)`/g, '$1'))

const highlights = showcase.map(({ key, emoji }) => {
	const title = localFeatures[key]?.title || features[key].title
	const description = localFeatures[key]?.description || features[key].description
	return `${emoji} ${markdown ? `**${title}**` : title}\n${inlineCode(description)}`
})

const REPO_URL = 'https://github.com/creeperkatze/modrinth-extras'
const footer = t('meta.description.footer').replace(
	/<link>(.*?)<\/link>[。.]?/,
	(_: string, text: string) => (markdown ? `[${text}](${REPO_URL})` : `${text}: ${REPO_URL}`),
)

const description = [
	...(summary ? [t('meta.summary')] : []),
	...highlights,
	`✨ ${t('meta.description.more')}`,
	footer,
	t('meta.description.disclaimer'),
].join('\n\n')

console.log(description)

// PowerShell reads it from an environment variable, which keeps emojis intact unlike piping to clip
const COPY: Record<string, string> = {
	win32: 'powershell -NoProfile -Command "Set-Clipboard $env:STORE_DESCRIPTION"',
	darwin: 'pbcopy',
}
try {
	execSync(COPY[process.platform] ?? 'xclip -selection clipboard', {
		input: description,
		env: { ...process.env, STORE_DESCRIPTION: description },
	})
	console.error('Copied to clipboard.')
} catch {
	console.error('Could not copy to clipboard.')
}
