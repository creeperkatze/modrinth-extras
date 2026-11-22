import type { QuickDownloadSettings } from '../../core/settings'
import { defineSyncedList } from '../../core/synced-list'

export interface QuickActionProfile extends QuickDownloadSettings {
	id: string
	name: string
}

export const MAX_QUICK_ACTION_PROFILES = 30

export const quickActionProfiles = defineSyncedList<QuickActionProfile>('quickActionProfiles')
