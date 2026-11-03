export const SITE_NAME = 'RuengFlix'
export const DEFAULT_DESCRIPTION = 'ទស្សនារឿងភាគខ្លីជាភាសាខ្មែរ ពេញភាគ និងអាប់ដេតថ្មីៗរៀងរាល់ថ្ងៃ។'
const DEFAULT_IMAGE = '/og-default.png'

interface PageMeta {
  /** Page title without the site name; omit for the home page */
  title?: string
  description?: string
  /** Absolute URL or a path under public/ (1200×630) */
  image?: string
  imageAlt?: string
  type?: 'website' | 'video.tv_show' | 'video.episode'
  /** Keep the page out of search results (e.g. search result pages) */
  noindex?: boolean
}

/**
 * Title, description, canonical URL and link-preview tags (Open Graph + Twitter card) for a page.
 * Telegram, Facebook and Messenger read the og:* tags when a link is shared.
 * Crawlers need absolute URLs, so set NUXT_PUBLIC_SITE_URL in production.
 */
export function usePageMeta(meta: MaybeRefOrGetter<PageMeta>) {
  const route = useRoute()
  const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
  const m = computed(() => toValue(meta))

  const absolute = (url: string) => (url.startsWith('http') ? url : `${site}${url}`)
  const fullTitle = computed(() => (m.value.title ? `${m.value.title} - ${SITE_NAME}` : `${SITE_NAME} - រឿងភាគខ្មែរ ពេញភាគ និងអាប់ដេតថ្មីៗ`))
  const description = computed(() => m.value.description ?? DEFAULT_DESCRIPTION)
  const image = computed(() => absolute(m.value.image ?? DEFAULT_IMAGE))
  // Canonical drops query strings (filters, search terms, ?source=pwa)
  const url = computed(() => `${site}${route.path}`)

  useSeoMeta({
    title: fullTitle,
    description,
    ogSiteName: SITE_NAME,
    ogLocale: 'km_KH',
    ogType: () => m.value.type ?? 'website',
    ogTitle: () => m.value.title ?? fullTitle.value,
    ogDescription: description,
    ogUrl: url,
    ogImage: image,
    ogImageWidth: 1200,
    ogImageHeight: 630,
    ogImageAlt: () => m.value.imageAlt ?? m.value.title ?? SITE_NAME,
    twitterCard: 'summary_large_image',
    twitterTitle: () => m.value.title ?? fullTitle.value,
    twitterDescription: description,
    twitterImage: image,
    robots: () => (m.value.noindex ? 'noindex, follow' : 'index, follow')
  })

  useHead({ link: [{ rel: 'canonical', href: url }] })
}
