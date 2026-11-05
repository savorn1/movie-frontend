<script setup lang="ts">
import type Hls from 'hls.js'

/*
 * The episode keeps playing in a small player in the corner while the viewer browses, like YouTube.
 * Opened by BingePlayer when someone leaves the watch page mid-episode; tapping it goes back to the full
 * player at the same second (its position is saved as it plays). Hidden on the watch page itself.
 */
const { state, close } = useMiniPlayer()
const { saveProgress } = useLibrary()
const { reload: reloadEpisodes, episodesOf } = useSeriesEpisodes()

// The link expired (they're short-lived): get a fresh one and carry on from the same second
let lastRefresh = 0
async function onError() {
  const s = state.value
  if (!s || s.type !== 'mp4' || Date.now() - lastRefresh < 15_000) return
  lastRefresh = Date.now()
  save()
  try {
    await reloadEpisodes(s.movieId)
    const fresh = episodesOf(s.movieId)?.find(e => e.number === s.ep)?.videoUrl
    if (!fresh) return dismiss()
    s.src = fresh
    attach()
  } catch {
    dismiss()
  }
}
const route = useRoute()

const video = ref<HTMLVideoElement>()
const box = ref<HTMLElement>()

/** Shrink from where the full player was into the corner (FLIP), once per hand-over */
function shrinkIn() {
  const s = state.value
  const el = box.value
  if (!s?.from || !el || reducedMotion()) return
  const to = el.getBoundingClientRect()
  const from = s.from
  s.from = undefined
  if (!from.width || !to.width) return
  const dx = from.left - to.left
  const dy = from.top - to.top
  const scale = Math.min(4, from.width / to.width)
  el.animate(
    [
      { transform: `translate(${dx}px, ${dy}px) scale(${scale})`, transformOrigin: 'top left', opacity: 0.6 },
      { transform: 'translate(0, 0) scale(1)', transformOrigin: 'top left', opacity: 1 }
    ],
    { duration: 380, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }
  )
}
const playing = ref(false)
const progress = ref(0)
let hls: Hls | null = null
let lastSave = 0

const visible = computed(() => !!state.value && !route.path.startsWith('/watch/') && !route.meta.immersive)

// Toasts and the back-to-top button move up above the corner player while it's showing
const lift = useFloatLift('mini')
watch([visible, box], async () => {
  await nextTick()
  lift.set(visible.value && box.value ? box.value.offsetHeight : 0)
})

async function attach() {
  const s = state.value
  const el = video.value
  if (!s || !el) return
  hls?.destroy()
  hls = null
  if (s.type === 'hls' && !el.canPlayType('application/vnd.apple.mpegurl')) {
    const { default: HlsCtor } = await import('hls.js')
    if (HlsCtor.isSupported()) {
      hls = new HlsCtor({ capLevelToPlayerSize: true, startPosition: s.time })
      hls.loadSource(s.src)
      hls.attachMedia(el)
    } else {
      el.src = s.src
    }
  } else {
    el.src = s.src
  }
  el.muted = s.muted
  el.addEventListener('loadedmetadata', () => (el.currentTime = s.time), { once: true })
  el.play().catch(() => {
    // Autoplay with sound refused: try muted rather than stopping
    el.muted = true
    el.play().catch(() => (playing.value = false))
  })
}

watch(visible, async (v) => {
  if (v) {
    await nextTick()
    shrinkIn()
    attach()
  } else {
    save()
    hls?.destroy()
    hls = null
    // Opening the watch page hands over to the full player
    if (state.value && route.path.startsWith('/watch/')) close()
  }
})

function save() {
  const el = video.value
  const s = state.value
  if (!el || !s || !el.duration) return
  saveProgress(s.movieId, s.ep, el.currentTime, el.duration)
  s.time = el.currentTime
}

function onTime() {
  const el = video.value
  if (!el) return
  progress.value = el.duration ? el.currentTime / el.duration : 0
  if (Date.now() - lastSave > 3000) {
    lastSave = Date.now()
    save()
  }
}

function toggle() {
  const el = video.value
  if (!el) return
  if (el.paused) el.play().catch(() => {})
  else el.pause()
}

function expand() {
  const s = state.value
  if (!s) return
  save()
  navigateTo(`/watch/${s.movieId}/${s.ep}`)
}

function dismiss() {
  save()
  video.value?.pause()
  hls?.destroy()
  hls = null
  close()
}

onBeforeUnmount(() => hls?.destroy())
</script>

<template>
  <Transition name="mini">
    <div v-if="visible && state" ref="box" class="mini" role="region" :aria-label="`កំពុងចាក់ ${state.title} វគ្គ ${kh(state.ep)}`">
      <button type="button" class="screen" :aria-label="`បើក ${state.title} វគ្គ ${kh(state.ep)}`" @click="expand">
        <video
          ref="video"
          :poster="state.poster"
          playsinline
          @timeupdate="onTime"
          @play="playing = true"
          @pause="playing = false; save()"
          @ended="dismiss"
          @error="onError"
          @contextmenu.prevent
        />
      </button>
      <div class="info">
        <strong>{{ state.title }}</strong>
        <span>វគ្គ {{ kh(state.ep) }}</span>
      </div>
      <button type="button" class="ctl" :aria-label="playing ? 'ផ្អាក' : 'ចាក់'" @click="toggle">
        <AppIcon :name="playing ? 'pause' : 'play'" :size="20" />
      </button>
      <button type="button" class="ctl" aria-label="បិទ" @click="dismiss">
        <AppIcon name="close" :size="18" />
      </button>
      <span class="line" :style="{ width: `${progress * 100}%` }" aria-hidden="true" />
    </div>
  </Transition>
</template>

<style scoped>
.mini {
  position: fixed;
  right: 16px;
  bottom: var(--float-base);
  z-index: 80;
  transition: bottom var(--dur) var(--ease-out);
  display: flex;
  align-items: center;
  gap: 6px;
  width: min(360px, calc(100% - 32px));
  padding: 6px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-elev);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.45);
}

.screen {
  flex: none;
  width: 128px;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  padding: 0;
  border-radius: 9px;
  background: #000;
}

.screen video {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.info {
  display: grid;
  flex: 1;
  min-width: 0;
}

.info strong {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 14px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.info span {
  color: var(--text-muted);
  font-size: 13px;
}

.ctl {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  color: var(--text-strong);
}

.ctl:hover {
  background: var(--bg-hover);
}

.line {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  background: var(--accent);
}

.mini-enter-active,
.mini-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}

.mini-enter-from,
.mini-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

</style>
