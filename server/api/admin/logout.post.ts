export default defineEventHandler(async (event) => {
  if (adminConfigured(event)) await (await adminSession(event)).clear()
  return { ok: true }
})
