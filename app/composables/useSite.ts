import { DEFAULT_HOME_ROWS, DEFAULT_PRICES, type HomeRow, type SitePrices } from '#shared/data/movies'

/** Site-wide settings (prices, home rows), loaded once per visit by the catalog plugin */
export function useSite() {
  const prices = useState<SitePrices>('site-prices', () => DEFAULT_PRICES)
  // Set in the admin portal (RuengFlix › Home rows); none set → the built-in four
  const homeRows = useState<HomeRow[]>('site-home-rows', () => DEFAULT_HOME_ROWS)

  async function refreshSite() {
    try {
      const site = await $fetch<{ prices: SitePrices; homeRows?: HomeRow[] }>('/api/site')
      prices.value = site.prices
      homeRows.value = site.homeRows?.length ? site.homeRows : DEFAULT_HOME_ROWS
    } catch {
      // keep the defaults
    }
  }

  const planPrice = (months: 1 | 3 | 6 | 12) => prices.value.vipPlans.find(p => p.months === months)?.price ?? 0

  return { prices, homeRows, planPrice, refreshSite }
}
