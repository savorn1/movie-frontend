/** All problem reports, newest first */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  return getReports()
})
