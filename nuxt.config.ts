// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },
  devServer: { port: 3010 },
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
    // movie-api (the Nest backend on VideoLingo's database): NUXT_MOVIE_API_BASE and NUXT_MOVIE_API_TOKEN.
    // Set: series, episodes, ratings, plays, reports and Telegram follows come from it.
    // Unset: the sample series, with viewer data in .data on this server.
    movieApiBase: '',
    movieApiToken: '',
    // /admin: NUXT_ADMIN_PASSWORD, NUXT_SESSION_SECRET (32+ characters)
    adminPassword: '',
    sessionSecret: '',
    // "Continue with Google" (NUXT_GOOGLE_CLIENT_ID, NUXT_GOOGLE_CLIENT_SECRET): an OAuth web client whose
    // authorized redirect URI is <siteUrl>/api/auth/google/callback. The token URL is overridable for tests.
    googleClientId: '',
    googleClientSecret: '',
    googleTokenUrl: 'https://oauth2.googleapis.com/token',
    // Browser push (npx web-push generate-vapid-keys): NUXT_VAPID_PRIVATE_KEY, NUXT_VAPID_SUBJECT (mailto:…),
    // and NUXT_PUBLIC_VAPID_PUBLIC_KEY below
    vapidPrivateKey: '',
    vapidSubject: '',
    // Telegram chat that receives viewer problem reports (NUXT_TELEGRAM_ADMIN_CHAT)
    telegramAdminChat: '',
    public: {
      telegramBot: '',
      vapidPublicKey: '',
      // videolingo-web admin URL, linked from /admin (NUXT_PUBLIC_VIDEOLINGO_ADMIN_URL)
      videolingoAdminUrl: '',
      siteUrl: 'http://localhost:3010'
    }
  },
  // Who follows which series (Telegram chat ids). Swap the fs driver for Redis/KV in production.
  nitro: {
    storage: {
      follows: { driver: 'fs', base: './.data/follows' },
      // Episode 👍/👎 totals; swap for Redis/KV in production like `follows`
      ratings: { driver: 'fs', base: './.data/ratings' },
      // The series catalog edited from /admin (seeded with sample content on first run)
      catalog: { driver: 'fs', base: './.data/catalog' },
      // Per-episode starts/completions, and viewer problem reports
      insights: { driver: 'fs', base: './.data/insights' },
      reports: { driver: 'fs', base: './.data/reports' }
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
