// Load the catalog and site settings once: on the server for the first page (they travel in the page
// payload), or in the browser if the app started without them.
export default defineNuxtPlugin(async () => {
  const { movies, refresh } = useCatalog()
  const { refreshSite } = useSite()
  const loaded = useState('site-loaded', () => false)
  await Promise.all([
    movies.value.length ? null : refresh(),
    loaded.value ? null : refreshSite().then(() => (loaded.value = true))
  ])
})
