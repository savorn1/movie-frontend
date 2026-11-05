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
  /** Where the full player was on screen, so the corner player can shrink out of it */
  from?: { left: number; top: number; width: number; height: number }
}

export function useMiniPlayer() {
  const state = useState<MiniState | null>('mini-player', () => null)
  return {
    state,
    open: (s: MiniState) => (state.value = s),
    close: () => (state.value = null)
  }
}
