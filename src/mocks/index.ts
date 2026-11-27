import type { AbstractFeature } from '@modrinth/api-client'

import { MockHostingFeature } from './hosting'

// Only builds with MOCK_HOSTING set include it, like `MOCK_HOSTING=1 pnpm build`
export function mockFeatures(): AbstractFeature[] {
	return import.meta.env.MOCK_HOSTING ? [new MockHostingFeature()] : []
}
