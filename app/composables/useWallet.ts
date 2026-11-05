export interface Wallet {
  coins: number
  vipUntil: string | null
  vipActive: boolean
  checkIn: { doneToday: boolean; streak: number; nextReward: number }
  episodeCoins: number
  /** KHQR payments are set up on the server */
  paymentsOn: boolean
  /** Extra coins (percent) on this viewer's first coin pack; 0 once they've paid for anything */
  firstTopUpBonusPercent: number
}

/** The signed-in viewer's coins and VIP time, shared by the Me page and the unlock wall */
export function useWallet() {
  const wallet = useState<Wallet | null>('wallet', () => null)
  const { viewer } = useViewer()

  async function refresh() {
    if (!viewer.value) {
      wallet.value = null
      return null
    }
    try {
      wallet.value = await $fetch<Wallet>('/api/wallet')
    } catch {
      // Keep the last known numbers
    }
    return wallet.value
  }

  async function checkIn() {
    wallet.value = await $fetch<Wallet>('/api/wallet/check-in', { method: 'POST' })
    return wallet.value
  }

  async function unlockEpisode(seriesId: number, episode: number) {
    const r = await $fetch<{ charged: number; wallet: Wallet }>('/api/wallet/unlock', { method: 'POST', body: { seriesId, episode } })
    wallet.value = r.wallet
    return r
  }

  return { wallet, refresh, checkIn, unlockEpisode }
}
