/** Whether admin is set up on this server, and whether this browser is logged in */
export default defineEventHandler(async (event) => {
  if (!adminConfigured(event)) return { configured: false, admin: false }
  const session = await adminSession(event)
  return { configured: true, admin: !!session.data.admin }
})
