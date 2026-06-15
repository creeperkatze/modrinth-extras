import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const directory = dirname(fileURLToPath(import.meta.url))
const localesDirectory = resolve(directory, '../src/locales')

const language =
	process.argv.find(
		(a) => !a.startsWith('--') && !a.includes('node') && !a.includes('store-desc'),
	) ?? 'en-US'

const markdown = process.argv.includes('--markdown')
const summary = process.argv.includes('--summary')

type MessageFile = Record<string, { defaultMessage?: string }>
type Messages = Record<string, string>

function loadMessages(locale: string, file: string): Messages {
	const enPath = resolve(localesDirectory, 'en-US', `${file}.json`)
	const localePath = resolve(localesDirectory, locale, `${file}.json`)
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

const meta = loadMessages(language, 'meta')
const popup = loadMessages(language, 'popup')

function t(messages: Messages, key: string): string {
	return messages[key] ?? ''
}

const generalFeatures = ['notifications', 'quickSearch', 'projectCardActions']
const contentFeatures = [
	'activitySparkline',
	'toolsSidebar',
	'dependenciesSidebar',
	'githubSidebar',
	'discordSidebar',
	'galleryBackground',
]
const extensionFeatures = ['notificationBadge', 'desktopNotifications', 'curseforgeRedirect']

function featureLines(keys: string[]): string {
	return keys
		.map((k) => `- ${t(popup, `feature.${k}.title`)}: ${t(popup, `feature.${k}.description`)}`)
		.join('\n')
}

const REPO_URL = 'https://github.com/creeperkatze/modrinth-extras'
const footer = t(meta, 'meta.description.footer').replace(
	/<link>(.*?)<\/link>[。.。]?/,
	(_, text: string) => (markdown ? `[${text}](${REPO_URL})` : `${text}: ${REPO_URL}`),
)

const description = [
	summary ? t(meta, 'meta.summary') : null,
	'',
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
	'',
	t(meta, 'meta.description.disclaimer'),
].join('\n')

console.log(description)
