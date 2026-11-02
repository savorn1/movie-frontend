interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: BeforeInstallPromptEvent | null = null

/**
 * "Install RuengFlix" support. Chrome/Android fire `beforeinstallprompt`, which we hold on to and
 * replay from a button; iPhone Safari has no prompt, so the Me page shows Share → Add to Home Screen.
 */
export function useInstallApp() {
  const state = useState<{ canPrompt: boolean; installed: boolean; ios: boolean }>('install-app', () => ({
    canPrompt: false,
    installed: false,
    ios: false
  }))

  function listen() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as Navigator & { standalone?: boolean }).standalone === true
    state.value.installed = standalone
    state.value.ios = /iPhone|iPad|iPod/i.test(navigator.userAgent) && !standalone

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault()
      deferred = e as BeforeInstallPromptEvent
      state.value.canPrompt = true
    })
    window.addEventListener('appinstalled', () => {
      deferred = null
      state.value = { ...state.value, canPrompt: false, installed: true }
    })
  }

  async function install() {
    if (!deferred) return false
    await deferred.prompt()
    const { outcome } = await deferred.userChoice
    deferred = null
    state.value.canPrompt = false
    return outcome === 'accepted'
  }

  return { state, listen, install }
}
