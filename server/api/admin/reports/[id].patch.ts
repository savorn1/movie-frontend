/** Mark a report resolved (or reopen it): PATCH { resolved: boolean } */
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = getRouterParam(event, 'id')
  const { resolved } = await readBody<{ resolved?: boolean }>(event)
  if (typeof resolved !== 'boolean') throw createError({ statusCode: 400, message: 'Expected { resolved: boolean }' })

  const report = await setReportResolved(String(id), resolved)
  if (!report) throw createError({ statusCode: 404, message: 'Report not found' })
  return report
})
