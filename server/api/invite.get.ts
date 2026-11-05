/** The viewer's invite link and how their invites are going */
export default defineEventHandler(async (event) => {
  const viewer = await requireViewer(event)
  setHeader(event, 'Cache-Control', 'private, no-store')
  const info = await viewerApi<{ code: string; joined: number; rewarded: number; coinsEach: number; watchesNeeded: number }>('GET', `/${viewer.id}/invite`)
  const site = useRuntimeConfig(event).public.siteUrl.replace(/\/$/, '')
  return { ...info, link: `${site}/?invite=${info.code}` }
})
