// Installable app + offline page. The service worker only runs in production builds so it never
// serves stale files during development.
export default defineNuxtPlugin(() => {
  useInstallApp().listen()

  if (import.meta.dev || !('serviceWorker' in navigator)) return
  // Register after load so it doesn't compete with the first render. Nuxt's entry script is async
  // and can run after `load` has already fired, so check readyState instead of only listening.
  const register = () => navigator.serviceWorker.register('/sw.js').catch(() => {})
  if (document.readyState === 'complete') register()
  else window.addEventListener('load', register, { once: true })
})
