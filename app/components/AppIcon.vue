<script setup lang="ts">
const props = defineProps<{ name: string; size?: number; solid?: boolean }>()

const paths: Record<string, string> = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  film: 'M4 4h16v16H4zM8 4v16M16 4v16M4 8h4M4 12h4M4 16h4M16 8h4M16 12h4M16 16h4',
  crown: 'M3 7l4.5 4L12 4l4.5 7L21 7l-2 12H5z',
  update: 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
  ranking: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  history: 'M12 7v5l3 2M3.5 12a8.5 8.5 0 1 0 2.5-6L3 9M3 4v5h5',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  fire: 'M12 3s5 4.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 1.5-4S9 12 11 12c0-4 1-9 1-9z',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0',
  play: 'M7 4.5v15l12-7.5z',
  pause: 'M7 5h3.5v14H7zM13.5 5H17v14h-3.5z',
  lock: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
  close: 'M6 6l12 12M18 6L6 18',
  'chevron-left': 'M15 5l-7 7 7 7',
  'chevron-right': 'M9 5l7 7-7 7',
  'arrow-up': 'M12 19V5M5 12l7-7 7 7',
  check: 'M5 12.5l4.5 4.5L19 7',
  shorts: 'M7 3h10a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM10.5 9.5v5l4-2.5z',
  compass: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM15.5 8.5l-2 5-5 2 2-5z',
  share: 'M12 15V3M8 7l4-4 4 4M5 12v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7',
  list: 'M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01',
  'chevron-up': 'M5 15l7-7 7 7',
  'chevron-down': 'M5 9l7 7 7-7',
  volume: 'M4 9h4l5-4v14l-5-4H4zM16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12',
  'volume-off': 'M4 9h4l5-4v14l-5-4H4zM17 9.5l5 5M22 9.5l-5 5',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  collapse: 'M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5',
  bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 20a2 2 0 0 0 4 0',
  telegram: 'M21 4L3 11l6 2 2 6 3-4 5 4z',
  sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  gauge: 'M4.5 16a8 8 0 1 1 15 0M12 12l4-4',
  send: 'M21 3 10 14M21 3l-7 18-4-7-7-4 18-7z',
  clip: 'M4 5h16v14H4zM4 9h16M8 5l2 4M13 5l2 4M10 13l4 2-4 2z',
  voice: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  danmaku: 'M3 6h11M7 11h14M3 16h9M15 16h6',
  monitor: 'M3 5h18v11H3zM8 20h8M12 16v4',
  more: 'M5 10.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM12 10.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2zM19 10.4a1.6 1.6 0 1 0 0 3.2 1.6 1.6 0 0 0 0-3.2z',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  pip: 'M3 5h18v14H3zM12 12h7v5h-7z',
  skip: 'M5 5v14l9-7zM16 5v14',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9.5 9.5c0-1 1-1.5 2.5-1.5s2.5.6 2.5 1.7c0 2.3-5 1.3-5 3.6 0 1.1 1 1.7 2.5 1.7s2.5-.5 2.5-1.5',
  comment: 'M4 5h16v11H9l-5 4z',
  download: 'M12 3v12M7 10l5 5 5-5M5 21h14',
  pin: 'M9 3h6l-1 6 3 3H7l3-3zM12 12v9',
  alert: 'M12 3l10 18H2zM12 10v5M12 18h.01',
  gift: 'M4 11h16v10H4zM3 7h18v4H3zM12 7v14M12 7c-1.5-3-5-3-5-1s3 1 5 1zM12 7c1.5-3 5-3 5-1s-3 1-5 1z',
  sparkle: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z'
}

// Some glyphs are always filled; closed shapes also fill when `solid` marks the active state.
const alwaysFilled = ['play', 'pause', 'crown', 'fire', 'more']
const closedShapes = ['home', 'heart', 'lock', 'shorts', 'user', 'pin', 'sparkle']
const filled = computed(() =>
  alwaysFilled.includes(props.name) || (props.solid && closedShapes.includes(props.name))
)
</script>

<template>
  <svg
    :width="size ?? 20"
    :height="size ?? 20"
    viewBox="0 0 24 24"
    :fill="filled ? 'currentColor' : 'none'"
    stroke="currentColor"
    :stroke-width="filled ? 0.6 : 1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
  >
    <path :d="paths[name]" />
  </svg>
</template>
