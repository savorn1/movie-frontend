export type ThemePref = 'system' | 'light' | 'dark'
export type ResolvedTheme = 'light' | 'dark'

export const THEME_COOKIE = 'theme'
export const THEME_COLORS: Record<ResolvedTheme, string> = { dark: '#000000', light: '#f5f6f8' }

/**
 * Appearance setting. "system" (the default) follows the device; "light"/"dark" override it.
 * The choice is a cookie so the server can render an explicit choice directly, and the inline
 * script from plugins/theme.ts resolves "system" before first paint (no flash of the wrong theme).
 */
export function useTheme() {
  const cookie = useCookie<ThemePref>(THEME_COOKIE, {
    default: () => 'system',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax'
  })
  // Shared state: separate useCookie() calls don't share one ref, so every caller reads this
  const pref = useState<ThemePref>('theme-pref', () =>
    cookie.value === 'light' || cookie.value === 'dark' ? cookie.value : 'system'
  )
  // What is actually showing; on the client the theme plugin syncs it with <html data-theme>
  const resolved = useState<ResolvedTheme>('theme-resolved', () => (pref.value === 'light' ? 'light' : 'dark'))

  function systemTheme(): ResolvedTheme {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
  }

  function apply() {
    if (import.meta.server) return
    const next = pref.value === 'system' ? systemTheme() : pref.value
    const root = document.documentElement
    // Recolour in one step rather than letting every element's transition animate
    root.classList.add('theme-switching')
    root.dataset.theme = next
    resolved.value = next
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove('theme-switching')))
  }

  function setTheme(next: ThemePref) {
    pref.value = next
    cookie.value = next
    apply()
  }

  return { pref, resolved, setTheme, apply, systemTheme }
}
