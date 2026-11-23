import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'

type Messages = { [key: string]: string | Messages }

// Crowdin leaves untranslated strings empty, so they're removed to fall back to English
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

for (const locale of readdirSync('src/locales')) {
	if (locale === 'en-US') continue
	const dir = `src/locales/${locale}`
	const kept = readdirSync(dir)
		.filter((file) => file.endsWith('.json'))
		.map((file) => pruneFile(`${dir}/${file}`))
	if (!kept.includes(true)) rmSync(dir, { recursive: true })
}

for (const file of readdirSync('website/src/locales')) {
	if (file.endsWith('.json') && file !== 'en-US.json') pruneFile(`website/src/locales/${file}`)
}
