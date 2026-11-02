// Runs before first paint: reads the theme cookie, falls back to the device setting,
// and sets <html data-theme>. Kept tiny and dependency-free because it blocks rendering.
const bootScript = `(function(){try{var m=document.cookie.match(/(?:^|; )${THEME_COOKIE}=([^;]*)/);`
  + `var p=m?decodeURIComponent(m[1]):'system';`
  + `var t=p==='light'||p==='dark'?p:(matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');`
  + `document.documentElement.dataset.theme=t;`
  + `var c=document.querySelector('meta[name="theme-color"]');if(c)c.content=t==='light'?'${THEME_COLORS.light}':'${THEME_COLORS.dark}';`
  + `}catch(e){}})()`

function syncThemeColor(theme: ResolvedTheme) {
  let tag = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
  if (!tag) {
    tag = document.createElement('meta')
    tag.name = 'theme-color'
    document.head.appendChild(tag)
  }
  tag.content = THEME_COLORS[theme]
}

export default defineNuxtPlugin(() => {
  const { pref, resolved, apply, systemTheme } = useTheme()

  // An explicit choice is known on the server; "system" is left to the boot script.
  const explicit = computed(() => (pref.value === 'system' ? undefined : pref.value))

  useHead({
    htmlAttrs: {
      'data-theme': computed(() => (import.meta.server ? explicit.value : resolved.value))
    },
    script: [{ key: 'theme-boot', innerHTML: bootScript, tagPosition: 'head', tagPriority: 'critical' }]
  })

  // Browser-bar colour: rendered once by the server, then kept in sync directly by
  // syncThemeColor() (letting the head manager own it duplicated the tag on hydration)
  if (import.meta.server) {
    useHead({ meta: [{ name: 'theme-color', content: THEME_COLORS[explicit.value ?? 'dark'] }] })
  }

  if (import.meta.client) {
    // Pick up what the boot script decided, then keep following the device while on "system"
    const current = document.documentElement.dataset.theme
    resolved.value = current === 'light' ? 'light' : current === 'dark' ? current : systemTheme()
    syncThemeColor(resolved.value)
    watch(resolved, syncThemeColor)

    const media = window.matchMedia('(prefers-color-scheme: light)')
    media.addEventListener('change', () => pref.value === 'system' && apply())
  }
})
