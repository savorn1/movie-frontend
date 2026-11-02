// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxt/fonts'],
  css: ['~/assets/css/main.css'],
  // Self-hosted from Google Fonts at build time, with metric-matched fallbacks to avoid layout shift.
  // Kantumruy Pro: UI and reading text. Koulen: display only (hero, page titles, rank numerals).
  fonts: {
    families: [
      { name: 'Kantumruy Pro', provider: 'google', weights: [400, 500, 600, 700], styles: ['normal'], global: true },
      { name: 'Koulen', provider: 'google', weights: [400], styles: ['normal'], global: true }
    ],
    defaults: {
      // The module defaults to Latin only; without 'khmer' every Khmer glyph would fall back
      subsets: ['khmer', 'latin'],
      fallbacks: { 'sans-serif': ['Noto Sans Khmer', 'Khmer Sangam MN', 'Khmer UI', 'Arial'] }
    }
  },
  // Set via env: NUXT_TELEGRAM_BOT_TOKEN, NUXT_TELEGRAM_WEBHOOK_SECRET, NUXT_NOTIFY_SECRET,
  // NUXT_PUBLIC_TELEGRAM_BOT (bot username without @), NUXT_PUBLIC_SITE_URL
  runtimeConfig: {
    telegramBotToken: '',
    telegramWebhookSecret: '',
    notifySecret: '',
    public: {
      telegramBot: '',
      siteUrl: 'http://localhost:3000'
    }
  },
  // Who follows which series (Telegram chat ids). Swap the fs driver for Redis/KV in production.
  nitro: {
    storage: {
      follows: { driver: 'fs', base: './.data/follows' }
    }
  },
  // Cross-fades between pages; Nuxt skips it when Reduce Motion is on
  experimental: { viewTransition: true },
  routeRules: { '/new': { redirect: '/browse' } },
  app: {
    head: {
      htmlAttrs: { lang: 'km-KH' },
      title: 'RuengFlix - រឿងភាគខ្មែរ',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        // theme-color is set by useTheme() so the browser bar matches the chosen appearance
        { name: 'color-scheme', content: 'dark light' },
        { name: 'apple-mobile-web-app-capable', content: 'yes' },
        { name: 'apple-mobile-web-app-title', content: 'RuengFlix' },
        { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' }
      ],
      link: [
        { rel: 'manifest', href: '/manifest.webmanifest' },
        { rel: 'apple-touch-icon', href: '/icons/apple-touch-icon.png' },
        { rel: 'icon', type: 'image/png', sizes: '192x192', href: '/icons/icon-192.png' }
      ]
    }
  }
})
