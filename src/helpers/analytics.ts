import { PostHog } from 'posthog-js'
import { browser } from 'wxt/browser'

const POSTHOG_TOKEN = 'phc_oWL7DUqxG3kmN20nWBkie7Eu7i3GJMdvGnvKRWBI7hi'
const POSTHOG_HOST = 'https://hedgehog.creeperkatze.de'

let posthog: PostHog | null = null
let enabled = true
const queue: Array<{ event: string; properties?: Record<string, unknown> }> = []

export function setAnalyticsEnabled(value: boolean): void {
	enabled = value
	if (!value) posthog?.opt_out_capturing()
}

async function getSharedDistinctId(): Promise<string> {
	const stored = await browser.storage.local.get(['posthog_distinct_id'])
	if (stored.posthog_distinct_id) {
		return stored.posthog_distinct_id as string
	}
	const distinctId = crypto.randomUUID()
	await browser.storage.local.set({ posthog_distinct_id: distinctId })
	return distinctId
}

async function initAnalytics(persistence: 'localStorage' | 'memory'): Promise<void> {
	const stored = await browser.storage.local.get(['analyticsEnabled'])
	if (stored.analyticsEnabled === false) {
		enabled = false
		return
	}
	const distinctId = await getSharedDistinctId()
	posthog = new PostHog()
	posthog.init(POSTHOG_TOKEN, {
		api_host: POSTHOG_HOST,
		bootstrap: { distinctID: distinctId },
		disable_external_dependency_loading: true,
		persistence,
		autocapture: false,
		capture_pageview: false,
		capture_pageleave: false,
		disable_session_recording: true,
		sanitize_properties: (properties) => {
			for (const key of Object.keys(properties)) {
				if (key.startsWith('$')) delete properties[key]
			}
			return properties
		},
	})
	for (const { event, properties } of queue.splice(0)) {
		posthog.capture(event, properties)
	}
}

export async function initPopupAnalytics(): Promise<void> {
	await initAnalytics('localStorage')
}

export async function initBackgroundAnalytics(): Promise<void> {
	await initAnalytics('memory')
}

export function capture(event: string, properties?: Record<string, unknown>): void {
	if (!enabled) return
	if (posthog) {
		posthog.capture(event, properties)
	} else {
		queue.push({ event, properties })
	}
}
