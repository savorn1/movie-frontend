interface NetworkInfo {
  saveData: boolean
  cellular: boolean
  slow: boolean
}

type Connection = {
  saveData?: boolean
  type?: string
  effectiveType?: string
  addEventListener?: (type: 'change', cb: () => void) => void
}

/**
 * Data saver: "auto" turns on when the browser reports Data Saver, a cellular connection or a
 * slow network (Network Information API, Chrome/Android; other browsers report nothing, so
 * "auto" stays off there). When active: no next-episode preloading, lowest HLS quality first,
 * smaller hero images.
 */
export function useDataSaver() {
  const { prefs } = useLibrary()
  const network = useState<NetworkInfo>('network-info', () => ({ saveData: false, cellular: false, slow: false }))

  const active = computed(() =>
    prefs.value.dataSaver === 'on'
    || (prefs.value.dataSaver === 'auto' && (network.value.saveData || network.value.cellular || network.value.slow))
  )

  const reason = computed(() => {
    if (prefs.value.dataSaver === 'on') return 'បើកជានិច្ច'
    if (prefs.value.dataSaver === 'off') return 'បិទ'
    if (network.value.saveData) return 'កំពុងបើក · ទូរស័ព្ទកំពុងសន្សំទិន្នន័យ'
    if (network.value.cellular) return 'កំពុងបើក · ប្រើទិន្នន័យទូរស័ព្ទ'
    if (network.value.slow) return 'កំពុងបើក · អ៊ីនធឺណិតយឺត'
    return 'បិទ · ប្រើ Wi-Fi'
  })

  /** Read the connection once and keep following changes (called from a client plugin) */
  function watchNetwork() {
    const c = (navigator as Navigator & { connection?: Connection }).connection
    if (!c) return
    const read = () => {
      network.value = {
        saveData: !!c.saveData,
        cellular: c.type === 'cellular',
        slow: ['slow-2g', '2g', '3g'].includes(c.effectiveType ?? '')
      }
    }
    read()
    c.addEventListener?.('change', read)
  }

  return { active, reason, network, watchNetwork }
}
