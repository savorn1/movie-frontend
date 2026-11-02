const KEY = 'ruengflix-library'

export default defineNuxtPlugin((nuxtApp) => {
  const { history, favorites, recentSearches, following, unlocked, prefs, seen } = useLibrary()

  // Per-viewer UI (badges, counts) waits until after hydration so it never mismatches the server HTML
  // (app:suspense:resolve, not app:mounted: the page can still be hydrating when app:mounted fires,
  // and attribute changes made during hydration are not patched in production)
  const hydrated = useHydrated()
  nuxtApp.hook('app:suspense:resolve', () => {
    hydrated.value = true
  })
  useDataSaver().watchNetwork()
  const lists = { history, favorites, recentSearches, following, unlocked }

  // Storage can be missing or throw (private mode, blocked site data); the app works without it.
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    for (const [key, state] of Object.entries(lists)) {
      if (Array.isArray(saved[key])) state.value = saved[key]
    }
    if (saved.prefs && typeof saved.prefs === 'object') prefs.value = { ...prefs.value, ...saved.prefs }
    if (saved.seen && typeof saved.seen === 'object') seen.value = saved.seen
  } catch {}

  watch([history, favorites, recentSearches, following, unlocked, prefs, seen], () => {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        history: history.value,
        favorites: favorites.value,
        recentSearches: recentSearches.value,
        following: following.value,
        unlocked: unlocked.value,
        prefs: prefs.value,
        seen: seen.value
      }))
    } catch {}
  }, { deep: true })
})
