import { readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { dirname, join, resolve } from 'path'
import { fileURLToPath } from 'url'

type Messages = { [key: string]: string | Messages }

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const extensionLocales = join(root, 'src/locales')
const websiteLocales = join(root, 'website/src/locales')
const sourceLocale = 'en-US'

function prune(messages: Messages): Messages {
	const pruned: Messages = {}
	for (const [key, value] of Object.entries(messages)) {
		if (typeof value === 'object' && value !== null) {
			const nested = prune(value)
			if (Object.keys(nested).length) pruned[key] = nested
		} else if (value !== '') {
			pruned[key] = value
		}
	}
	return pruned
}

// Returns whether the file still has any strings
function pruneFile(path: string): boolean {
	const content = readFileSync(path, 'utf8')
	const original = JSON.parse(content)
	const messages = prune(original)
	if (!Object.keys(messages).length) {
		rmSync(path)
		return false
	}
	if (JSON.stringify(messages) !== JSON.stringify(original)) {
		const indent = content.match(/^\s+(?=")/m)?.[0] ?? '\t'
		writeFileSync(path, `${JSON.stringify(messages, null, indent)}\n`)
	}
	return true
}

for (const locale of readdirSync(extensionLocales)) {
	if (locale === sourceLocale) continue
	const dir = join(extensionLocales, locale)
	const kept = readdirSync(dir)
		.filter((file) => file.endsWith('.json'))
		.map((file) => pruneFile(join(dir, file)))
	if (!kept.includes(true)) rmSync(dir, { recursive: true })
}

for (const file of readdirSync(websiteLocales)) {
	if (file.endsWith('.json') && file !== `${sourceLocale}.json`)
		pruneFile(join(websiteLocales, file))
}
