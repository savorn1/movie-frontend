import type { Movie } from '#shared/data/movies'

/**
 * "Because you watched X": series other signed-in viewers watched after X (movie-api counts them from
 * synced libraries), for the series this viewer watched most recently. Leaves out what they've
 * started; null until there are at least three to show.
 */
export function useBecauseYouWatched(limit = 10) {
  const { history } = useLibrary()
  const { find } = useCatalog()
  const result = ref<{ source: Movie; items: Movie[] } | null>(null)

  const source = computed(() => history.value.map(h => find(h.id)).find((m): m is Movie => !!m?.remote))

  watch(
    () => source.value?.id,
    async (id) => {
      if (!id) {
        result.value = null
        return
      }
      try {
        const recs = await $fetch<{ seriesId: number }[]>('/api/recommendations', { query: { series: id } })
        const started = new Set(history.value.map(h => h.id))
        const items = recs
          .map(r => find(r.seriesId))
          .filter((m): m is Movie => !!m && !started.has(m.id))
          .slice(0, limit)
        result.value = items.length >= 3 ? { source: source.value!, items } : null
      } catch {
        result.value = null
      }
    },
    { immediate: true }
  )

  return result
}
