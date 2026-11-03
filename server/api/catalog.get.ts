/** The live catalog for pages (loaded once per visit by the catalog plugin) */
export default defineEventHandler(() => getCatalog())
