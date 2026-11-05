export interface Promotion {
  kind: 'FREE_SERIES' | 'COIN_BONUS'
  title: string
  seriesId: number | null
  seriesTitle: string | null
  bonusPercent: number | null
  endsAt: string
}

/** Running promotions (a VIP series free for a while, extra coins on packs), loaded once per visit */
export function usePromotions() {
  const list = useState<Promotion[]>('promotions', () => [])
  const loaded = useState('promotions-loaded', () => false)
  async function load() {
    if (loaded.value) return
    loaded.value = true
    try {
      list.value = (await $fetch<Promotion[]>('/api/promotions')).filter(p => Date.parse(p.endsAt) > Date.now())
    } catch {
      loaded.value = false
    }
  }
  return { list, load }
}
