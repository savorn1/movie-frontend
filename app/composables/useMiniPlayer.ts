/** What the corner player is playing after the viewer left the watch page (see MiniPlayer.vue) */
export interface MiniState {
  movieId: number
  ep: number
  title: string
  poster: string
  src: string
  type: 'hls' | 'mp4'
  /** Where the full player was */
  time: number
  muted: boolean
}

export function useMiniPlayer() {
  const state = useState<MiniState | null>('mini-player', () => null)
  return {
    state,
    open: (s: MiniState) => (state.value = s),
    close: () => (state.value = null)
  }
}
