<script setup lang="ts">
import { isLocked, type Movie } from '#shared/data/movies'

const props = defineProps<{ movie: Movie; current?: number; compact?: boolean }>()

// Locked episodes still open the watch page, which shows the unlock wall in context
const { canWatch, lastEpisode } = useLibrary()
const hydrated = useHydrated()

/**
 * What each episode is to this viewer, shown with an icon as well as colour: locked (VIP, not paid),
 * unlocked (VIP they paid for), watched (before the one they're on), or plain free
 */
type EpState = 'locked' | 'unlocked' | 'watched' | 'free'
const last = computed(() => (hydrated.value ? lastEpisode(props.movie.id) ?? 0 : 0))
function stateOf(ep: number): EpState {
  if (!canWatch(props.movie, ep)) return 'locked'
  if (ep < last.value) return 'watched'
  return isLocked(props.movie, ep) ? 'unlocked' : 'free'
}
const LABELS: Record<EpState, string> = { locked: 'ត្រូវការ VIP', unlocked: 'បានដោះសោ', watched: 'បានមើល', free: 'ឥតគិតថ្លៃ' }
const label = (ep: number) => `វគ្គ ${kh(ep)} · ${ep === props.current ? 'កំពុងមើល' : LABELS[stateOf(ep)]}`
const hasVip = computed(() => props.movie.vip && props.movie.episodes > props.movie.freeEpisodes)

/*
 * Episode details (title, thumbnail, length) on hover with a mouse, or a long press on touch screens.
 * movie-api series only, once their episodes are loaded.
 */
const { episodesOf } = useSeriesEpisodes()
const peek = ref<{ ep: number; left: number; top: number } | null>(null)
const info = computed(() => (peek.value ? episodesOf(props.movie.id)?.find(e => e.number === peek.value!.ep) ?? null : null))
const minutes = (s: number | null) => (s ? `${kh(Math.max(1, Math.round(s / 60)))} នាទី` : '')
let pressTimer: ReturnType<typeof setTimeout> | undefined
let pressed = false

function show(ep: number, el: HTMLElement) {
  if (!props.movie.remote) return
  const r = el.getBoundingClientRect()
  peek.value = { ep, left: r.left + r.width / 2, top: r.top }
}
function onEnter(ep: number, e: MouseEvent) {
  if (window.matchMedia('(hover: hover)').matches) show(ep, e.currentTarget as HTMLElement)
}
function onPressStart(ep: number, e: TouchEvent) {
  pressed = false
  const el = e.currentTarget as HTMLElement
  pressTimer = setTimeout(() => {
    pressed = true
    show(ep, el)
    haptic('tap')
  }, 450)
}
function onPressEnd() {
  clearTimeout(pressTimer)
}
// A long press shows the details instead of opening the episode
function onClick(e: MouseEvent) {
  if (pressed) {
    e.preventDefault()
    pressed = false
  }
}
onBeforeUnmount(() => clearTimeout(pressTimer))

// Long series are split into ranges of 30 so the grid stays scannable
const RANGE = 30
const ranges = computed(() => {
  const out: [number, number][] = []
  for (let s = 1; s <= props.movie.episodes; s += RANGE) out.push([s, Math.min(s + RANGE - 1, props.movie.episodes)])
  return out
})
const rangeIndex = ref(Math.floor(((props.current ?? 1) - 1) / RANGE))
watch(() => props.current, c => c && (rangeIndex.value = Math.floor((c - 1) / RANGE)))

const visible = computed(() => {
  const [a, b] = ranges.value[rangeIndex.value] ?? [1, props.movie.episodes]
  return Array.from({ length: b - a + 1 }, (_, i) => a + i)
})
</script>

<template>
  <div class="episodes" :class="{ compact }">
    <div v-if="ranges.length > 1" class="ranges" role="group" aria-label="ជួរវគ្គ">
      <button
        v-for="(r, i) in ranges"
        :key="i"
        type="button"
        :aria-pressed="rangeIndex === i"
        @click="rangeIndex = i"
      >
        {{ r[0] === r[1] ? kh(r[0]) : `${kh(r[0])}–${kh(r[1])}` }}
      </button>
    </div>
    <ol class="grid">
      <li v-for="ep in visible" :key="ep">
        <NuxtLink
          :to="`/watch/${movie.id}/${ep}`"
          :class="[stateOf(ep), { current: ep === current }]"
          :aria-current="ep === current ? 'true' : undefined"
          :aria-label="label(ep)"
          @mouseenter="onEnter(ep, $event)"
          @mouseleave="peek = null"
          @touchstart.passive="onPressStart(ep, $event)"
          @touchend="onPressEnd"
          @touchmove.passive="onPressEnd"
          @click="onClick"
          @contextmenu="pressed && $event.preventDefault()"
        >
          <span v-if="ep === current" class="eq" aria-hidden="true"><i /><i /><i /></span>
          {{ kh(ep) }}
          <AppIcon v-if="stateOf(ep) === 'locked'" name="lock" :size="12" class="mark lock" />
          <AppIcon v-else-if="stateOf(ep) === 'unlocked' && ep !== current" name="crown" :size="11" class="mark crown" />
          <AppIcon v-else-if="stateOf(ep) === 'watched' && ep !== current" name="check" :size="12" class="mark seen" />
        </NuxtLink>
      </li>
    </ol>
    <Teleport to="body">
      <div
        v-if="peek && info"
        class="ep-peek"
        :style="{ left: `clamp(110px, ${peek.left}px, calc(100vw - 110px))`, top: `${peek.top}px` }"
        role="tooltip"
        @click="peek = null"
      >
        <img v-if="info.thumbnailUrl" :src="info.thumbnailUrl" alt="" width="200" height="112" decoding="async">
        <strong>វគ្គ {{ kh(peek.ep) }}<template v-if="info.title"> · {{ info.title }}</template></strong>
        <span>{{ minutes(info.durationSeconds) }}<template v-if="info.locked"> · VIP</template></span>
      </div>
    </Teleport>
    <ul v-if="!compact || hasVip" class="legend" aria-hidden="true">
      <li><AppIcon name="check" :size="12" class="seen" /> បានមើល</li>
      <li v-if="hasVip"><AppIcon name="crown" :size="11" class="crown" /> បានដោះសោ</li>
      <li v-if="hasVip"><AppIcon name="lock" :size="12" class="lock" /> VIP</li>
    </ul>
  </div>
</template>

<style scoped>
.ranges {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
}

.ranges button {
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  background: var(--bg-elev-2);
  color: var(--text-muted);
  font-size: 14px;
  font-weight: 600;
}

.ranges button[aria-pressed='true'] {
  background: var(--text-strong);
  color: var(--bg);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.compact .grid {
  grid-template-columns: repeat(5, 1fr);
}

.grid a {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  border-radius: 10px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  font-weight: 600;
}

.grid a:hover {
  background: var(--bg-hover);
}

.grid a.current {
  background: var(--text-strong);
  border-color: var(--text-strong);
  color: var(--bg);
}

.grid a.locked {
  color: var(--text-muted);
  border-style: dashed;
}

.grid a.watched {
  color: var(--text-muted);
  background: transparent;
}

.grid a.unlocked {
  border-color: rgba(255, 184, 0, 0.55);
}

.mark {
  position: absolute;
  top: 4px;
  right: 4px;
}

.lock,
.crown {
  color: var(--accent-text);
}

.seen {
  color: #2fbf71;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 14px;
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
  color: var(--text-muted);
  font-size: 12px;
}

.legend li {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* "Now playing" bars on the current episode */
.eq {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}

.eq i {
  width: 3px;
  background: currentColor;
  border-radius: 1px;
  animation: eq 0.9s ease-in-out infinite;
}

.eq i:nth-child(2) {
  animation-delay: -0.3s;
}

.eq i:nth-child(3) {
  animation-delay: -0.6s;
}

@keyframes eq {
  0%,
  100% {
    height: 4px;
  }
  50% {
    height: 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .eq i {
    height: 10px;
    animation: none;
  }
}

@media (max-width: 640px) {
  .grid {
    grid-template-columns: repeat(5, 1fr);
  }
}

.ep-peek {
  position: fixed;
  z-index: 120;
  display: grid;
  gap: 4px;
  width: 200px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--bg-elev);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
  transform: translate(-50%, calc(-100% - 8px));
}

.ep-peek img {
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  border-radius: 8px;
  object-fit: cover;
  background: #000;
}

.ep-peek strong {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ep-peek span {
  color: var(--text-muted);
  font-size: 12px;
}
</style>
