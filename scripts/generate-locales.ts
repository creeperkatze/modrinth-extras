import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'

// Every locale Chrome accepts in _locales, see https://developer.chrome.com/docs/extensions/reference/api/i18n#locales
const CHROME_LOCALES = `
	ar am bg bn ca cs da de el en en_AU en_GB en_US es es_419 et fa fi fil fr gu he hi hr hu id it
	ja kn ko lt lv ml mr ms nl no pl pt_BR pt_PT ro ru sk sl sr sv sw ta te th tr uk vi zh_CN zh_TW
`
	.trim()
	.split(/\s+/)

for (const locale of readdirSync('src/locales')) {
	const path = `src/locales/${locale}/meta.json`
	if (!existsSync(path)) continue
	const summary = JSON.parse(readFileSync(path, 'utf8'))['meta.summary']?.defaultMessage
	if (!summary) continue

	const { language, region } = new Intl.Locale(locale)
	const chromeLocale = [`${language}_${region}`, language].find((code) =>
		CHROME_LOCALES.includes(code),
	)
	if (!chromeLocale) {
		console.warn(`No Chrome locale for ${locale}, skipping.`)
		continue
	}

	const messages = { extName: { message: 'Modrinth Extras' }, extDescription: { message: summary } }
	mkdirSync(`src/public/_locales/${chromeLocale}`, { recursive: true })
	writeFileSync(
		`src/public/_locales/${chromeLocale}/messages.json`,
		`${JSON.stringify(messages, null, '\t')}\n`,
	)
	console.log(`Generated _locales/${chromeLocale}/messages.json`)
}
