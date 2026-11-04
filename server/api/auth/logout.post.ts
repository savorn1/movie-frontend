/** Sign out on this device */
export default defineEventHandler(async (event) => {
  if (useRuntimeConfig(event).sessionSecret.length >= 32) await (await viewerSession(event)).clear()
  return { ok: true }
})
