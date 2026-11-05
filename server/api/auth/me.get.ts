/** Whether accounts are on, which sign-in buttons work, and who is signed in (null when nobody) */
export default defineEventHandler(async (event) => {
  const viewer = await currentViewer(event)
  if (viewer) markActive(viewer)
  return {
    enabled: viewerAccountsEnabled(event),
    methods: signInMethods(event),
    /** Came through a friend's invite link and hasn't signed up yet */
    invited: !viewer && !!getCookie(event, INVITE_COOKIE),
    viewer: viewer && { ...clientViewer(viewer), canResetPassword: await mayResetPassword(event, viewer) }
  }
})
