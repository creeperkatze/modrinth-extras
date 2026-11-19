import { storage } from '@wxt-dev/storage'

export interface IntroductionTourState {
	// People who updated get told what changed instead of a plain introduction
	updated: boolean
	// Steps added in later versions still show up for people who saw the earlier ones
	seenSteps: string[]
}

export const introductionTourItem = storage.defineItem<IntroductionTourState>(
	'local:introductionTour',
	{
		defaultValue: { updated: false, seenSteps: [] },
	},
)

export async function markExtensionUpdated() {
	const state = await introductionTourItem.getValue()
	await introductionTourItem.setValue({ ...state, updated: true })
}

export async function markTourStepsSeen(ids: string[]) {
	const state = await introductionTourItem.getValue()
	await introductionTourItem.setValue({
		...state,
		seenSteps: [...new Set([...state.seenSteps, ...ids])],
	})
}
