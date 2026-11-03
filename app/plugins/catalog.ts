// Load the catalog once: on the server for the first page (it travels in the page payload),
// or in the browser if the app started without it.
export default defineNuxtPlugin(async () => {
  const { movies, refresh } = useCatalog()
  if (!movies.value.length) await refresh()
})
