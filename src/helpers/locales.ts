export interface LocaleDefinition {
	code: string
	name: string
	dir?: 'ltr' | 'rtl'
}

export const LOCALES: LocaleDefinition[] = [
	{ code: 'en-US', name: 'English' },
	// { code: 'ar-SA', name: 'العربية', dir: 'rtl' },
	// { code: 'cs-CZ', name: 'Čeština' },
	// { code: 'da-DK', name: 'Dansk' },
	// { code: 'de-CH', name: 'Schweizerdeutsch' },
	{ code: 'de-DE', name: 'Deutsch' },
	// { code: 'es-419', name: 'Español (Latinoamérica)' },
	// { code: 'es-ES', name: 'Español' },
	// { code: 'fi-FI', name: 'Suomi' },
	// { code: 'fil-PH', name: 'Filipino' },
	// { code: 'fr-FR', name: 'Français' },
	// { code: 'he-IL', name: 'עברית', dir: 'rtl' },
	// { code: 'hu-HU', name: 'Magyar' },
	// { code: 'id-ID', name: 'Bahasa Indonesia' },
	{ code: 'it-IT', name: 'Italiano' },
	// { code: 'ja-JP', name: '日本語' },
	// { code: 'ko-KR', name: '한국어' },
	// { code: 'ms-MY', name: 'Bahasa Melayu' },
	// { code: 'nl-NL', name: 'Nederlands' },
	// { code: 'no-NO', name: 'Norsk' },
	// { code: 'pl-PL', name: 'Polski' },
	// { code: 'pt-BR', name: 'Português (Brasil)' },
	// { code: 'pt-PT', name: 'Português' },
	// { code: 'ro-RO', name: 'Română' },
	// { code: 'ru-RU', name: 'Русский' },
	// { code: 'sr-CS', name: 'Српски' },
	// { code: 'sv-SE', name: 'Svenska' },
	// { code: 'th-TH', name: 'ไทย' },
	// { code: 'tr-TR', name: 'Türkçe' },
	// { code: 'uk-UA', name: 'Українська' },
	// { code: 'vi-VN', name: 'Tiếng Việt' },
	// { code: 'zh-CN', name: '简体中文' },
	// { code: 'zh-TW', name: '繁體中文' },
]
