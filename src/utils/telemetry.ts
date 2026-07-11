import 'posthog-js/dist/surveys'

import { storage } from '@wxt-dev/storage'
import { PostHog, type Survey, type SurveyResponseValue } from 'posthog-js/dist/module.no-external'
import { browser } from 'wxt/browser'

import { getSettings } from './settings'

const POSTHOG_TOKEN = 'phc_oWL7DUqxG3kmN20nWBkie7Eu7i3GJMdvGnvKRWBI7hi'
const POSTHOG_HOST = 'https://hedgehog.creeperkatze.dev'

const distinctIdItem = storage.defineItem<string>('local:posthog_distinct_id')

let posthog: PostHog | null = null
let enabled = true
const queue: Array<{ event: string; properties?: Record<string, unknown> }> = []

export function setTelemetryEnabled(value: boolean): void {
	enabled = value
	if (!value) posthog?.opt_out_capturing()
	else posthog?.opt_in_capturing()
}

async function getSharedDistinctId(): Promise<string> {
	const stored = await distinctIdItem.getValue()
	if (stored) return stored
	const distinctId = crypto.randomUUID()
	await distinctIdItem.setValue(distinctId)
	return distinctId
}

export async function initTelemetry(): Promise<void> {
	const settings = await getSettings()
	if (!settings.telemetry.enabled) {
		enabled = false
		return
	}

	// On Firefox, respect the built-in data collection consent experience
	const perms = await browser.permissions.getAll()
	if ('data_collection' in perms) {
		const granted = (perms as unknown as { data_collection: string[] }).data_collection
		if (!granted.includes('technicalAndInteraction')) {
			enabled = false
			return
		}
	}
	const distinctId = await getSharedDistinctId()
	const userAgent = navigator.userAgent
	let browserName = 'unknown'
	if (userAgent.includes('Firefox')) browserName = 'firefox'
	else if (userAgent.includes('Edg')) browserName = 'edge'
	else if (userAgent.includes('Chrome')) browserName = 'chrome'
	else if (userAgent.includes('Safari')) browserName = 'safari'

	posthog = new PostHog()
	posthog.init(POSTHOG_TOKEN, {
		api_host: POSTHOG_HOST,
		bootstrap: { distinctID: distinctId },
		disable_external_dependency_loading: true,
		persistence: 'localStorage',
		autocapture: false,
		capture_pageview: false,
		capture_pageleave: false,
		disable_session_recording: true,
		sanitize_properties: (properties) => {
			for (const key of Object.keys(properties)) {
				if (key.startsWith('$') && key !== '$set' && !key.startsWith('$survey')) {
					delete properties[key]
				}
			}
			return properties
		},
	})
	const version = browser.runtime.getManifest().version
	posthog.register({ extension_version: version, browser: browserName })

	for (const { event, properties } of queue.splice(0)) {
		posthog.capture(event, properties)
	}
}

export function capture(event: string, properties?: Record<string, unknown>): void {
	if (!enabled) return
	if (posthog) {
		posthog.capture(event, properties)
	} else {
		queue.push({ event, properties })
	}
}

export function getActiveSurvey(): Promise<Survey | null> {
	return new Promise((resolve) => {
		if (!enabled || !posthog) {
			resolve(null)
			return
		}
		const ph = posthog

		ph.onSurveysLoaded((_surveys, context) => {
			if (context?.error) {
				console.error('[Modrinth Extras] Survey: Failed to load surveys:', context.error)
				resolve(null)
				return
			}
			ph.getActiveMatchingSurveys((surveys) => {
				console.log(
					`[Modrinth Extras] Survey: Loaded ${surveys.length} matching survey(s).`,
					surveys,
				)
				resolve(surveys[0] ?? null)
			})
		})
	})
}

export function captureSurveyShown(survey: Survey): void {
	capture('survey shown', { $survey_id: survey.id, $survey_name: survey.name })
}

export function captureSurveyResponse(survey: Survey, response: SurveyResponseValue): void {
	capture('survey sent', {
		$survey_id: survey.id,
		$survey_name: survey.name,
		$survey_response: response,
		$set: { [`$survey_responded/${survey.id}`]: true },
	})
}

export function captureSurveyDismissed(survey: Survey): void {
	capture('survey dismissed', {
		$survey_id: survey.id,
		$survey_name: survey.name,
		$set: { [`$survey_dismissed/${survey.id}`]: true },
	})
}
