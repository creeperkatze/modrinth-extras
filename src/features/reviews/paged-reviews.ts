import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/vue-query'
import { computed, ref, watch } from 'vue'

export type PagedResult<T, E extends string> = { ok: true; data: T } | { ok: false; error: E }

interface PageInfo {
	page: number
	lastPage: number
	pageSize: number
}

interface PagedReviewsOptions<T, E extends string> {
	// Called inside a computed, so reactive filters like the sort belong in the key.
	key: (page: number) => readonly unknown[]
	fetchPage: (page: number) => Promise<PagedResult<T, E> | undefined>
	source: string
	prefetchNext?: boolean
}

export function usePagedReviews<T extends PageInfo, E extends string>(
	options: PagedReviewsOptions<T, E>,
) {
	const queryClient = useQueryClient()
	const page = ref(1)

	async function load(pageNumber: number): Promise<PagedResult<T, E>> {
		try {
			const result = await options.fetchPage(pageNumber)
			if (!result) throw new Error('No response from the background')
			return result
		} catch (err) {
			console.error(`[Modrinth Extras] Failed to load ${options.source} reviews:`, err)
			throw err
		}
	}

	const query = useQuery({
		queryKey: computed(() => options.key(page.value)),
		queryFn: () => load(page.value),
		placeholderData: keepPreviousData,
	})

	// The previous page stays as placeholder only to keep the page count while the next one loads.
	const loading = computed(() => query.isPending.value || query.isPlaceholderData.value)
	const pageInfo = computed(() => (query.data.value?.ok ? query.data.value.data : null))
	const data = computed(() => (loading.value ? null : pageInfo.value))
	const error = computed<E | 'failed' | null>(() => {
		if (query.isError.value) return 'failed'
		const result = query.data.value
		return !loading.value && result && !result.ok ? result.error : null
	})

	if (options.prefetchNext) {
		watch(data, (current) => {
			if (!current || current.page >= current.lastPage) return
			const next = current.page + 1
			void queryClient.prefetchQuery({ queryKey: options.key(next), queryFn: () => load(next) })
		})
	}

	function switchPage(pageNumber: number) {
		page.value = pageNumber
		// Only the bottom pagination needs this, the top one is already in view.
		const panel = document.getElementById('modrinth-extras-reviews-panel')
		if (panel && panel.getBoundingClientRect().top < 0) panel.scrollIntoView({ block: 'start' })
	}

	return { page, data, pageInfo, loading, error, switchPage }
}
