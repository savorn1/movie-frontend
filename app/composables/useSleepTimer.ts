export type SleepMode = 'off' | 'episode' | '15' | '30' | '60'

/**
 * Sleep timer shared across episodes for this visit: stop at the end of the current episode,
 * or pause after 15/30/60 minutes.
 */
export function useSleepTimer() {
  const state = useState<{ mode: SleepMode; until: number }>('sleep-timer', () => ({ mode: 'off', until: 0 }))

  function set(mode: SleepMode) {
    state.value = { mode, until: /^\d+$/.test(mode) ? Date.now() + Number(mode) * 60_000 : 0 }
  }

  const clear = () => set('off')
  /** A minutes timer has run out */
  const expired = () => state.value.until > 0 && Date.now() >= state.value.until
  const stopAtEpisodeEnd = computed(() => state.value.mode === 'episode')

  return { state, set, clear, expired, stopAtEpisodeEnd }
}
