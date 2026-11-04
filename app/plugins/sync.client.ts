import { cleanLibrary, mergeLibraries, type SyncedLibrary } from '#shared/data/librarySync'

/*
 * Keeps the library in step with the viewer's account. Runs after library.client (plugins load in
 * file-name order), so this device's saved library is already in place. On sign-in the device's
 * copy and the account's are merged once; after that every change is saved to the account, a
 * couple of seconds after it happens. An account with Telegram then gets Telegram alerts for every
 * series it follows, including ones followed before Telegram was added.
 */
export default defineNuxtPlugin((nuxtApp) => {
  const { viewer, refreshViewer } = useViewer()
  const { history, favorites, following, unlocked, recentSearches, seen, ratings } = useLibrary()

  const snapshot = (): SyncedLibrary =>
    cleanLibrary({
      history: history.value,
      favorites: favorites.value,
      following: following.value,
      unlocked: unlocked.value,
      recentSearches: recentSearches.value,
      seen: seen.value,
      ratings: ratings.value
    })

  function apply(lib: SyncedLibrary) {
    history.value = lib.history
    favorites.value = lib.favorites
    following.value = lib.following
    unlocked.value = lib.unlocked
    recentSearches.value = lib.recentSearches
    seen.value = lib.seen
    ratings.value = lib.ratings
  }

  // Saving is on only after this device has merged with the account
  let syncedFor: number | null = null
  let applying = false
  let timer: ReturnType<typeof setTimeout> | undefined

  async function push() {
    timer = undefined
    if (syncedFor == null || viewer.value?.id !== syncedFor) return
    try {
      await $fetch('/api/library', { method: 'PUT', body: { data: snapshot() } })
    } catch (err) {
      // Signed out elsewhere (password changed, account disabled): show it here too
      if ((err as { statusCode?: number }).statusCode === 401) await refreshViewer()
    }
  }

  async function pull(id: number) {
    try {
      const remote = await $fetch<{ data: unknown }>('/api/library')
      applying = true
      apply(mergeLibraries(snapshot(), cleanLibrary(remote.data)))
      syncedFor = id
      await nextTick()
      applying = false
      await push()
      await alertsForFollowed()
    } catch {
      applying = false
      // Try again on the next sign-in or page load
    }
  }

  async function alertsForFollowed() {
    if (!viewer.value?.telegram || !following.value.length) return
    await $fetch('/api/follows', { method: 'POST', body: { seriesIds: following.value } }).catch(() => {})
  }

  // Telegram added to the account on the Me page: alerts for what they already follow
  watch(
    () => !!viewer.value?.telegram,
    (linked, before) => {
      if (linked && before === false && syncedFor != null) alertsForFollowed()
    }
  )

  watch(
    () => viewer.value?.id ?? null,
    (id) => {
      clearTimeout(timer)
      syncedFor = null
      if (id != null) pull(id)
    }
  )

  watch(
    [history, favorites, following, unlocked, recentSearches, seen, ratings],
    () => {
      if (applying || syncedFor == null) return
      clearTimeout(timer)
      timer = setTimeout(push, 2000)
    },
    { deep: true }
  )

  // Don't lose the last change when the tab is closed
  window.addEventListener('pagehide', () => {
    if (timer && syncedFor != null) {
      clearTimeout(timer)
      try {
        fetch('/api/library', {
          method: 'PUT',
          keepalive: true,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ data: snapshot() })
        })
      } catch {}
    }
  })

  nuxtApp.hook('app:suspense:resolve', () => {
    refreshViewer()
  })
})
