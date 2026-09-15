import { posthog } from '@wxt-dev/analytics/providers/posthog'

import { defineAppConfig } from '#imports'

export default defineAppConfig({
	analytics: {
		providers: [
			posthog({
				apiKey: 'phc_oWL7DUqxG3kmN20nWBkie7Eu7i3GJMdvGnvKRWBI7hi',
				apiHost: 'https://hedgehog.creeperkatze.dev',
			}),
		],
	},
})
