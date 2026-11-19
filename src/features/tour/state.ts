import { storage } from '@wxt-dev/storage'

export interface PopupTourState {
	// People who updated get told what changed instead of a plain introduction
	updated: boolean
	// Steps added in later versions still show up for people who saw the earlier ones
	seenSteps: string[]
}

export const popupTourItem = storage.defineItem<PopupTourState>('local:popupTour', {
	defaultValue: { updated: false, seenSteps: [] },
})

export async function markExtensionUpdated() {
	const state = await popupTourItem.getValue()
	await popupTourItem.setValue({ ...state, updated: true })
}

export async function markTourStepsSeen(ids: string[]) {
	const state = await popupTourItem.getValue()
	await popupTourItem.setValue({
		...state,
		seenSteps: [...new Set([...state.seenSteps, ...ids])],
	})
}
