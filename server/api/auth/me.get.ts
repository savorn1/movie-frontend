/** Whether accounts are on, and who is signed in (null when nobody) */
export default defineEventHandler(async (event) => ({
  enabled: viewerAccountsEnabled(event),
  viewer: await currentViewer(event)
}))
