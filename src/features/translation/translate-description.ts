interface LanguageDetectorResult {
	detectedLanguage: string
	confidence: number
}

interface LanguageDetectorInstance {
	detect(text: string): Promise<LanguageDetectorResult[]>
}

interface LanguageDetectorStatic {
	availability(): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>
	create(): Promise<LanguageDetectorInstance>
}

export interface TranslatorInstance {
	translate(text: string): Promise<string>
	destroy(): void
}

interface TranslatorStatic {
	availability(options: {
		sourceLanguage: string
		targetLanguage: string
	}): Promise<'unavailable' | 'downloadable' | 'downloading' | 'available'>
	create(options: { sourceLanguage: string; targetLanguage: string }): Promise<TranslatorInstance>
}

function getLanguageDetector(): LanguageDetectorStatic | undefined {
	return (globalThis as unknown as { LanguageDetector?: LanguageDetectorStatic }).LanguageDetector
}

function getTranslator(): TranslatorStatic | undefined {
	return (globalThis as unknown as { Translator?: TranslatorStatic }).Translator
}

// Chrome's on-device Translator/LanguageDetector APIs; unavailable in Firefox.
export function isTranslationSupported(): boolean {
	return getLanguageDetector() !== undefined && getTranslator() !== undefined
}

const MIN_DETECTION_CONFIDENCE = 0.6

export interface TranslationCandidate {
	sourceLanguage: string
}

const candidateCache = new Map<string, Promise<TranslationCandidate | null>>()

// Null means translation doesn't apply here (unsupported, or already in the target language).
export function detectTranslationCandidate(
	cacheKey: string,
	text: string,
	targetLanguage: string,
): Promise<TranslationCandidate | null> {
	const key = `${cacheKey}:${targetLanguage}`
	const cached = candidateCache.get(key)
	if (cached) return cached

	const promise = (async () => {
		const LanguageDetector = getLanguageDetector()
		if (!LanguageDetector) return null

		try {
			const availability = await LanguageDetector.availability()
			if (availability === 'unavailable') return null

			const detector = await LanguageDetector.create()
			const [top] = await detector.detect(text.slice(0, 1000))
			if (!top || top.confidence < MIN_DETECTION_CONFIDENCE) return null

			const sourceLanguage = top.detectedLanguage
			if (sourceLanguage.split('-')[0].toLowerCase() === targetLanguage.split('-')[0].toLowerCase())
				return null

			return { sourceLanguage }
		} catch (err) {
			console.error('[Modrinth Extras] Translate description: Failed to detect language:', err)
			return null
		}
	})()

	candidateCache.set(key, promise)
	return promise
}

export async function createTranslator(
	sourceLanguage: string,
	targetLanguage: string,
): Promise<TranslatorInstance | null> {
	const Translator = getTranslator()
	if (!Translator) return null

	try {
		const availability = await Translator.availability({ sourceLanguage, targetLanguage })
		if (availability === 'unavailable') return null
		return await Translator.create({ sourceLanguage, targetLanguage })
	} catch (err) {
		console.error('[Modrinth Extras] Translate description: Failed to create translator:', err)
		return null
	}
}
