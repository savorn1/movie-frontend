import { DEFAULT_PRICES, type SitePrices } from '#shared/data/movies'

/** Site-wide settings (prices), loaded once per visit by the catalog plugin */
export function useSite() {
  const prices = useState<SitePrices>('site-prices', () => DEFAULT_PRICES)

  async function refreshSite() {
    try {
      prices.value = (await $fetch<{ prices: SitePrices }>('/api/site')).prices
    } catch {
      // keep the defaults
    }
  }

  const planPrice = (months: 1 | 3 | 6 | 12) => prices.value.vipPlans.find(p => p.months === months)?.price ?? 0

  return { prices, planPrice, refreshSite }
}
