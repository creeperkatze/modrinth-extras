import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const localesDir = resolve(__dirname, '../src/locales')

const lang =
	process.argv.find(
		(a) => !a.startsWith('--') && !a.includes('node') && !a.includes('store-desc'),
	) ?? 'en-US'
const markdown = process.argv.includes('--markdown')

type MessageFile = Record<string, { defaultMessage?: string }>
type Messages = Record<string, string>

function loadMessages(locale: string, file: string): Messages {
	const enPath = resolve(localesDir, 'en-US', `${file}.json`)
	const localePath = resolve(localesDir, locale, `${file}.json`)
	const en: MessageFile = JSON.parse(readFileSync(enPath, 'utf8'))
	let local: MessageFile = {}
	try {
		local = JSON.parse(readFileSync(localePath, 'utf8'))
	} catch {
		console.warn(`Could not load messages for locale "${locale}", falling back to en-US.`)
	}
	const merged: Messages = {}
	for (const key of Object.keys(en)) {
		merged[key] = (local[key]?.defaultMessage || en[key]?.defaultMessage) ?? ''
	}
	return merged
}

const meta = loadMessages(lang, 'meta')
const popup = loadMessages(lang, 'popup')

function t(messages: Messages, key: string): string {
	return messages[key] ?? ''
}

// Feature order per group, matching popup.json keys
const generalFeatures = ['notifications', 'quickSearch', 'projectCardActions']
const contentFeatures = [
	'activitySparkline',
	'toolsSidebar',
	'dependenciesSidebar',
	'githubSidebar',
	'discordSidebar',
]
const extensionFeatures = ['notificationBadge', 'desktopNotifications', 'curseforgeRedirect']

function featureLines(keys: string[]): string {
	return keys
		.map((k) => `- ${t(popup, `feature.${k}.title`)}: ${t(popup, `feature.${k}.description`)}`)
		.join('\n')
}

const REPO_URL = 'https://github.com/creeperkatze/modrinth-extras'
const footer = t(meta, 'meta.description.footer').replace(
	/<link>(.*?)<\/link>\./,
	(_, text: string) => (markdown ? `[${text}](${REPO_URL}).` : `${text}: ${REPO_URL}`),
)

const desc = [
	t(meta, 'meta.description.generalTitle'),
	featureLines(generalFeatures),
	'',
	t(meta, 'meta.description.contentTitle'),
	featureLines(contentFeatures),
	'',
	t(meta, 'meta.description.extensionTitle'),
	featureLines(extensionFeatures),
	'',
	footer,
].join('\n')

console.log(desc)
