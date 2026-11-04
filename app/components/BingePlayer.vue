<script setup lang="ts">
import type Hls from 'hls.js'
import { episodeSource, type Movie } from '#shared/data/movies'
import type { SleepMode } from '~/composables/useSleepTimer'

const props = defineProps<{ movie: Movie; ep: number }>()

const { canWatch, recordWatch, saveProgress, resumeTime, prefs, markSeen } = useLibrary()
const { show } = useToast()
const { share } = useShare()
const route = useRoute()
const { active: saveData } = useDataSaver()

const SPEEDS = [0.75, 1, 1.25, 1.5, 2]
const COUNTDOWN = 3

const wrap = ref<HTMLElement>()
const video = ref<HTMLVideoElement>()
const sheet = ref<HTMLDialogElement>()

const playing = ref(false)
const current = ref(0)
const duration = ref(0)
const bufferedEnd = ref(0)
const muted = ref(false)
const needsTap = ref(false)
const ended = ref(false)
const waiting = ref(false)
const controlsVisible = ref(true)
const countdown = ref<number | null>(null)
const wallEp = ref<number | null>(null)
const skipHint = ref<{ side: 'left' | 'right'; key: number } | null>(null)
const isFullscreen = ref(false)
const moreOpen = ref(false)
const reporting = ref(false)
const pipSupported = ref(false)
const inPip = ref(false)

const { track } = useInsights()
const sleep = useSleepTimer()
const sleepOptions: { value: SleepMode; label: string }[] = [
  { value: 'off', label: 'បិទ' },
  { value: 'episode', label: 'ចប់វគ្គនេះ' },
  { value: '15', label: '១៥ នាទី' },
  { value: '30', label: '៣០ នាទី' },
  { value: '60', label: '៦០ នាទី' }
]

// Skip recap: episodes 2+ open with a recap of the last one
const showSkipRecap = computed(() =>
  props.ep > 1 && props.movie.recapSeconds > 0 && !wallEp.value
  && duration.value > props.movie.recapSeconds + 1 && current.value < props.movie.recapSeconds
)
function skipRecap() {
  if (video.value) video.value.currentTime = props.movie.recapSeconds
}
const pseudoFullscreen = ref(false)

const { byCategory } = useCatalog()
const source = computed(() => episodeSource(props.movie, props.ep))
const nextEp = computed(() => (props.ep < props.movie.episodes ? props.ep + 1 : null))
const prevEp = computed(() => (props.ep > 1 ? props.ep - 1 : null))
const nextSeries = computed(() => byCategory(props.movie.category).find(m => m.id !== props.movie.id))
const nextSource = computed(() => (nextEp.value && canWatch(props.movie, nextEp.value) ? episodeSource(props.movie, nextEp.value) : null))
// Warm the next MP4 once this episode is half watched, so the switch feels instant
// (skipped in data-saver mode: it would spend mobile data on an episode that may not be watched)
const preloadNext = computed(() =>
  !saveData.value && nextSource.value?.type === 'mp4' && duration.value > 0 && current.value / duration.value > 0.5
)

const fmt = (s: number) => {
  if (!Number.isFinite(s)) return '0:00'
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

// ---------- Loading ----------
let hls: Hls | null = null

async function load() {
  const el = video.value
  if (!el) return
  hls?.destroy()
  hls = null
  ended.value = false
  countdown.value = null
  needsTap.value = false
  current.value = 0
  duration.value = 0

  if (!canWatch(props.movie, props.ep)) {
    el.removeAttribute('src')
    el.load()
    wallEp.value = props.ep
    return
  }
  wallEp.value = null
  recordWatch(props.movie.id, props.ep)
  markSeen(props.movie.id)

  const { src, type } = source.value
  if (type === 'hls' && !el.canPlayType('application/vnd.apple.mpegurl')) {
    const { default: HlsCtor } = await import('hls.js')
    if (HlsCtor.isSupported()) {
      // Data saver: start on the lowest rendition and never climb above it
      hls = new HlsCtor({ capLevelToPlayerSize: true, startLevel: saveData.value ? 0 : -1 })
      if (saveData.value) hls.on(HlsCtor.Events.MANIFEST_PARSED, () => hls && (hls.autoLevelCapping = 0))
      hls.loadSource(src)
      hls.attachMedia(el)
    } else {
      el.src = src
    }
  } else {
    el.src = src
  }
  el.playbackRate = el.defaultPlaybackRate = prefs.value.speed
  play()
}

function play() {
  video.value?.play().then(() => (needsTap.value = false)).catch(() => {
    // Autoplay with sound was blocked (first visit straight to this URL)
    needsTap.value = true
  })
}

function onLoadedMetadata() {
  const el = video.value!
  duration.value = el.duration
  applyCaptions()
  // A shared moment (?t=42) wins over the viewer's own saved position
  const shared = Number(route.query.t)
  if (Number.isFinite(shared) && shared > 0 && shared < el.duration - 1) {
    el.currentTime = shared
    show(`ចាប់ផ្តើមពី ${fmt(shared)} ដែលបានចែករំលែក`, { label: 'ចាប់ផ្តើមពីដើម', run: () => video.value && (video.value.currentTime = 0) })
    return
  }
  const t = resumeTime(props.movie.id, props.ep)
  if (t > 3) {
    el.currentTime = t
    show(`បន្តពី ${fmt(t)}`, { label: 'ចាប់ផ្តើមពីដើម', run: () => video.value && (video.value.currentTime = 0) })
  }
}

/** Share a link that opens this episode at the current second */
function shareMoment() {
  const t = Math.floor(current.value)
  share(`${props.movie.title} វគ្គ ${kh(props.ep)} · ${fmt(t)}`, `/watch/${props.movie.id}/${props.ep}?t=${t}`)
}

let lastSave = 0
function onTimeUpdate() {
  const el = video.value!
  current.value = el.currentTime
  if (el.buffered.length) bufferedEnd.value = el.buffered.end(el.buffered.length - 1)
  if (Date.now() - lastSave > 3000) persist()
  if (el.duration && el.currentTime / el.duration >= 0.9) track(props.movie.id, props.ep, 'complete')
  if (sleep.expired()) {
    el.pause()
    sleep.clear()
    show('ម៉ោងគេង៖ បានផ្អាកវីដេអូ')
  }
}

function onPlay() {
  playing.value = true
  track(props.movie.id, props.ep, 'start')
}

function persist() {
  const el = video.value
  if (!el || !el.duration || wallEp.value) return
  lastSave = Date.now()
  saveProgress(props.movie.id, props.ep, el.currentTime, el.duration)
}

// ---------- Auto-advance ----------
let tick: ReturnType<typeof setInterval> | undefined

function onEnded() {
  playing.value = false
  ended.value = true
  persist()
  const n = nextEp.value
  if (!n) return
  if (sleep.stopAtEpisodeEnd.value) {
    sleep.clear()
    show('ម៉ោងគេង៖ ឈប់បន្ទាប់ពីវគ្គនេះ')
    return
  }
  if (!canWatch(props.movie, n)) {
    // Cliffhanger wall over the frozen last frame
    wallEp.value = n
    return
  }
  countdown.value = COUNTDOWN
  tick = setInterval(() => {
    if (countdown.value === null) return clearInterval(tick)
    countdown.value -= 1
    if (countdown.value <= 0) {
      clearInterval(tick)
      goEp(n)
    }
  }, 1000)
}

function cancelCountdown() {
  clearInterval(tick)
  countdown.value = null
}

function goEp(n: number | null) {
  if (!n) return
  cancelCountdown()
  persist()
  navigateTo(`/watch/${props.movie.id}/${n}`)
}

function replay() {
  ended.value = false
  cancelCountdown()
  if (video.value) video.value.currentTime = 0
  play()
}

watch(() => props.ep, () => {
  sheet.value?.close()
  load()
})

// ---------- Controls ----------
function togglePlay() {
  const el = video.value
  if (!el || wallEp.value) return
  if (ended.value) return replay()
  el.paused ? play() : el.pause()
}

function seekBy(delta: number) {
  const el = video.value
  if (!el || !duration.value) return
  el.currentTime = Math.max(0, Math.min(duration.value - 0.1, el.currentTime + delta))
  skipHint.value = { side: delta < 0 ? 'left' : 'right', key: Date.now() }
  setTimeout(() => (skipHint.value = null), 600)
  reveal()
}

function onScrub(e: Event) {
  const el = video.value
  if (el) el.currentTime = Number((e.target as HTMLInputElement).value)
}

function toggleMute() {
  const el = video.value
  if (!el) return
  el.muted = !el.muted
  muted.value = el.muted
}

function setSpeed(s: number) {
  prefs.value.speed = s
  if (video.value) video.value.playbackRate = video.value.defaultPlaybackRate = s
}

function stepSpeed(dir: 1 | -1) {
  const i = SPEEDS.indexOf(prefs.value.speed)
  const next = SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, (i < 0 ? 1 : i) + dir))]!
  setSpeed(next)
  show(`ល្បឿន ${next}×`)
}

function applyCaptions() {
  const track = video.value?.textTracks[0]
  if (track) track.mode = prefs.value.captions ? 'showing' : 'hidden'
  liftCues()
}

// Cues default to the very bottom of the video, which on phones sits under the control bar.
// Lift every cue a few lines up (works for any subtitle file, not just the samples).
function liftCues() {
  const cues = video.value?.textTracks[0]?.cues
  for (const cue of Array.from(cues ?? [])) {
    const c = cue as VTTCue
    c.snapToLines = true
    c.line = -4
  }
}

function toggleCaptions() {
  prefs.value.captions = !prefs.value.captions
  applyCaptions()
}

async function toggleFullscreen() {
  const el = wrap.value!
  const v = video.value as HTMLVideoElement & { webkitEnterFullscreen?: () => void }
  if (document.fullscreenElement) return document.exitFullscreen()
  if (pseudoFullscreen.value) {
    pseudoFullscreen.value = false
    isFullscreen.value = false
    return
  }
  if (el.requestFullscreen) {
    const ok = await el.requestFullscreen().then(() => true, () => false)
    if (ok) return
  } else if (v?.webkitEnterFullscreen) {
    return v.webkitEnterFullscreen() // iPhone Safari
  }
  // Facebook/Telegram in-app browsers often refuse the Fullscreen API: fill the viewport instead
  pseudoFullscreen.value = true
  isFullscreen.value = true
}

const onFullscreenChange = () => (isFullscreen.value = !!document.fullscreenElement)

// Controls fade out while playing and come back on any movement, tap or key
let hideTimer: ReturnType<typeof setTimeout> | undefined
function reveal() {
  controlsVisible.value = true
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    if (playing.value) controlsVisible.value = false
  }, 2800)
}
watch(playing, p => (p ? reveal() : (controlsVisible.value = true)))

// ---------- Gestures (touch) ----------
let touch = { x: 0, y: 0 }
let lastTap = { t: 0, side: '' }
let singleTapTimer: ReturnType<typeof setTimeout> | undefined

function onTouchStart(e: TouchEvent) {
  const t = e.touches[0]!
  touch = { x: t.clientX, y: t.clientY }
}

function onTouchEnd(e: TouchEvent) {
  const t = e.changedTouches[0]!
  const dx = t.clientX - touch.x
  const dy = t.clientY - touch.y
  e.preventDefault() // no synthetic click after a touch

  // Swipe up = next episode, swipe down = previous
  if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx) * 1.5) {
    goEp(dy < 0 ? nextEp.value : prevEp.value)
    return
  }
  if (Math.abs(dx) > 12 || Math.abs(dy) > 12) return

  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const side = t.clientX - rect.left < rect.width / 2 ? 'left' : 'right'
  const now = Date.now()
  if (now - lastTap.t < 300 && lastTap.side === side) {
    // Double tap: skip 10 s on that side
    clearTimeout(singleTapTimer)
    seekBy(side === 'left' ? -10 : 10)
    lastTap = { t: 0, side: '' }
    return
  }
  lastTap = { t: now, side }
  singleTapTimer = setTimeout(() => {
    if (controlsVisible.value && !playing.value) togglePlay()
    else if (controlsVisible.value) controlsVisible.value = false
    else reveal()
  }, 300)
}

// ---------- Keyboard ----------
function onKey(e: KeyboardEvent) {
  const target = e.target as HTMLElement
  if (target.closest('input:not([type=range]), textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return
  const k = e.key
  const map: Record<string, () => void> = {
    ' ': togglePlay,
    Escape: () => pseudoFullscreen.value && toggleFullscreen(),
    k: togglePlay,
    ArrowLeft: () => seekBy(-10),
    j: () => seekBy(-10),
    ArrowRight: () => seekBy(10),
    l: () => seekBy(10),
    f: toggleFullscreen,
    m: toggleMute,
    c: toggleCaptions,
    n: () => goEp(nextEp.value),
    p: () => goEp(prevEp.value),
    '>': () => stepSpeed(1),
    '<': () => stepSpeed(-1)
  }
  const action = map[k]
  if (!action) return
  // Let the range slider and buttons keep their own arrow/space behaviour
  if ((k === ' ' && target.closest('button, a')) || (k.startsWith('Arrow') && target.matches('input[type=range]'))) return
  e.preventDefault()
  action()
  reveal()
}

// ---------- Lifecycle ----------
const onPageHide = () => persist()

// ---------- Picture-in-picture ----------
async function togglePip() {
  const el = video.value as HTMLVideoElement & { webkitSetPresentationMode?: (m: string) => void; webkitPresentationMode?: string }
  if (!el) return
  moreOpen.value = false
  try {
    if (document.pictureInPictureElement) await document.exitPictureInPicture()
    else if (el.requestPictureInPicture) await el.requestPictureInPicture()
    else el.webkitSetPresentationMode?.(el.webkitPresentationMode === 'picture-in-picture' ? 'inline' : 'picture-in-picture')
  } catch {
    show('មិនអាចបើករូបភាពក្នុងរូបភាពបានទេ')
  }
}

function openReport() {
  moreOpen.value = false
  video.value?.pause()
  reporting.value = true
}

function onMoreOutside(e: MouseEvent) {
  if (moreOpen.value && !(e.target as HTMLElement).closest('.more-wrap')) moreOpen.value = false
}

onMounted(() => {
  const v = video.value as (HTMLVideoElement & { webkitSupportsPresentationMode?: (m: string) => boolean }) | undefined
  pipSupported.value = (!!document.pictureInPictureEnabled && !v?.disablePictureInPicture)
    || !!v?.webkitSupportsPresentationMode?.('picture-in-picture')
  // Capture phase: the control bar stops click propagation
  document.addEventListener('click', onMoreOutside, true)
  window.addEventListener('keydown', onKey)
  window.addEventListener('pagehide', onPageHide)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  load()
})

onBeforeUnmount(() => {
  persist()
  hls?.destroy()
  clearInterval(tick)
  clearTimeout(hideTimer)
  clearTimeout(singleTapTimer)
  document.removeEventListener('click', onMoreOutside, true)
  window.removeEventListener('keydown', onKey)
  window.removeEventListener('pagehide', onPageHide)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
})

function openEpisodes() {
  sheet.value?.showModal()
}

function onUnlocked() {
  wallEp.value = null
  if (ended.value && nextEp.value) goEp(nextEp.value)
  else load()
}
</script>

<template>
  <div
    ref="wrap"
    class="player"
    :class="{ 'hide-ui': !controlsVisible && playing, fullscreen: isFullscreen, pseudo: pseudoFullscreen }"
    @mousemove="reveal"
  >
    <video
      ref="video"
      class="video"
      :poster="movie.banner"
      playsinline
      webkit-playsinline
      preload="metadata"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @play="onPlay"
      @enterpictureinpicture="inPip = true"
      @leavepictureinpicture="inPip = false"
      @pause="playing = false; persist()"
      @ended="onEnded"
      @waiting="waiting = true"
      @playing="waiting = false"
      @volumechange="muted = video!.muted"
    >
      <track v-if="source.subtitles" kind="subtitles" srclang="km" label="ខ្មែរ" :src="source.subtitles" default @load="liftCues">
    </video>

    <!-- Tap / click surface for gestures -->
    <div
      class="surface"
      @touchstart.passive="onTouchStart"
      @touchend="onTouchEnd"
      @click="togglePlay"
      @dblclick="toggleFullscreen"
    />

    <div v-if="waiting && playing" class="spinner" aria-hidden="true" />

    <Transition name="fade">
      <div v-if="skipHint" :key="skipHint.key" class="skip" :class="skipHint.side" aria-hidden="true">
        {{ skipHint.side === 'left' ? '−១០ វិ' : '+១០ វិ' }}
      </div>
    </Transition>

    <!-- Top bar: back + title (phones show it in immersive mode) -->
    <div class="top">
      <NuxtLink :to="`/detail/${movie.id}`" class="icon-btn back" aria-label="ត្រឡប់ទៅទំព័ររឿង">
        <AppIcon name="chevron-left" :size="22" />
      </NuxtLink>
      <div class="top-title">
        <strong>{{ movie.title }}</strong>
        <span>វគ្គ {{ kh(ep) }} / {{ kh(movie.episodes) }}</span>
      </div>
    </div>

    <button
      v-if="(!playing || needsTap) && !ended && !wallEp && !countdown"
      type="button"
      class="big-play"
      aria-label="ចាក់"
      @click="togglePlay"
    >
      <AppIcon name="play" :size="40" />
    </button>

    <!-- Auto-advance countdown -->
    <div v-if="countdown !== null" class="overlay" role="status" aria-live="polite">
      <p class="eyebrow">វគ្គបន្ទាប់ក្នុង {{ kh(countdown) }} វិនាទី</p>
      <strong class="next-title">វគ្គ {{ kh(nextEp ?? 0) }}</strong>
      <div class="ring" :style="{ '--p': (COUNTDOWN - countdown) / COUNTDOWN }" aria-hidden="true">
        <span>{{ kh(countdown) }}</span>
      </div>
      <EpisodeRating :movie-id="movie.id" :ep="ep" />
      <div class="row">
        <button type="button" class="btn btn-glass" @click="cancelCountdown">បោះបង់</button>
        <button type="button" class="btn btn-primary" @click="goEp(nextEp)">
          <AppIcon name="play" :size="16" />ចាក់ឥឡូវ
        </button>
      </div>
    </div>

    <!-- Ended without auto-advance -->
    <div v-else-if="ended && !wallEp" class="overlay">
      <template v-if="nextEp">
        <p class="eyebrow">ចប់វគ្គ {{ kh(ep) }}</p>
        <EpisodeRating :movie-id="movie.id" :ep="ep" />
        <div class="row">
          <button type="button" class="btn btn-glass" @click="replay">មើលម្តងទៀត</button>
          <button type="button" class="btn btn-primary" @click="goEp(nextEp)">
            <AppIcon name="play" :size="16" />វគ្គ {{ kh(nextEp) }}
          </button>
        </div>
      </template>
      <template v-else>
        <p class="eyebrow">ចប់រឿង {{ movie.title }}</p>
        <EpisodeRating :movie-id="movie.id" :ep="ep" />
        <NuxtLink v-if="nextSeries" :to="`/watch/${nextSeries.id}/1`" class="next-series">
          <img :src="nextSeries.poster" alt="">
          <span>
            <small>រឿងបន្ទាប់</small>
            <strong>{{ nextSeries.title }}</strong>
          </span>
        </NuxtLink>
        <button type="button" class="btn btn-glass" @click="replay">មើលវគ្គនេះម្តងទៀត</button>
      </template>
    </div>

    <UnlockWall v-if="wallEp" :movie="movie" :ep="wallEp" @unlocked="onUnlocked" />

    <!-- Bottom controls -->
    <div v-if="!wallEp" class="controls" @click.stop>
      <div class="scrub">
        <div class="buffer" :style="{ width: `${duration ? (bufferedEnd / duration) * 100 : 0}%` }" />
        <input
          type="range"
          min="0"
          :max="duration || 0"
          step="0.1"
          :value="current"
          aria-label="ទីតាំងវីដេអូ"
          :aria-valuetext="`${fmt(current)} នៃ ${fmt(duration)}`"
          :style="{ '--fill': `${duration ? (current / duration) * 100 : 0}%` }"
          @input="onScrub"
        >
      </div>
      <div class="bar">
        <button type="button" class="icon-btn" :aria-label="playing ? 'ផ្អាក' : 'ចាក់'" aria-keyshortcuts="k Space" @click="togglePlay">
          <AppIcon :name="playing ? 'pause' : 'play'" :size="22" />
        </button>
        <button type="button" class="icon-btn" aria-label="វគ្គមុន" aria-keyshortcuts="p" :disabled="!prevEp" @click="goEp(prevEp)">
          <AppIcon name="chevron-left" :size="22" />
        </button>
        <button type="button" class="icon-btn" aria-label="វគ្គបន្ទាប់" aria-keyshortcuts="n" :disabled="!nextEp" @click="goEp(nextEp)">
          <AppIcon name="chevron-right" :size="22" />
        </button>
        <span class="time">{{ fmt(current) }} / {{ fmt(duration) }}</span>
        <span class="spacer" />
        <!-- Less frequent actions live in a "More" panel so the bar stays usable on phones -->
        <div class="more-wrap">
          <button
            type="button"
            class="icon-btn"
            aria-label="ជម្រើសបន្ថែម"
            aria-haspopup="true"
            :aria-expanded="moreOpen"
            @click="moreOpen = !moreOpen"
          >
            <AppIcon name="more" :size="22" />
          </button>
          <div v-if="moreOpen" class="more-panel" role="group" aria-label="ជម្រើសបន្ថែម" @keydown.esc="moreOpen = false">
            <button type="button" @click="shareMoment(); moreOpen = false">
              <AppIcon name="share" :size="18" />ចែករំលែកពេលនេះ
            </button>
            <button v-if="pipSupported" type="button" @click="togglePip">
              <AppIcon name="pip" :size="18" />{{ inPip ? 'បិទរូបភាពក្នុងរូបភាព' : 'រូបភាពក្នុងរូបភាព' }}
            </button>
            <label class="sleep">
              <AppIcon name="moon" :size="18" />
              <span>ម៉ោងគេង</span>
              <select :value="sleep.state.value.mode" @change="sleep.set(($event.target as HTMLSelectElement).value as SleepMode)">
                <option v-for="o in sleepOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </label>
            <button type="button" @click="openReport">
              <AppIcon name="flag" :size="18" />រាយការណ៍បញ្ហា
            </button>
          </div>
        </div>
        <button
          type="button"
          class="icon-btn text"
          :aria-pressed="prefs.captions"
          aria-label="អក្សររត់ខ្មែរ"
          aria-keyshortcuts="c"
          @click="toggleCaptions"
        >
          CC
        </button>
        <label class="speed">
          <span class="sr-only">ល្បឿន</span>
          <select :value="prefs.speed" aria-keyshortcuts="< >" @change="setSpeed(Number(($event.target as HTMLSelectElement).value))">
            <option v-for="s in SPEEDS" :key="s" :value="s">{{ s }}×</option>
          </select>
        </label>
        <button type="button" class="icon-btn desk" :aria-label="muted ? 'បើកសំឡេង' : 'បិទសំឡេង'" aria-keyshortcuts="m" @click="toggleMute">
          <AppIcon :name="muted ? 'volume-off' : 'volume'" :size="22" />
        </button>
        <button type="button" class="icon-btn phone" aria-label="វគ្គទាំងអស់" @click="openEpisodes">
          <AppIcon name="list" :size="22" />
        </button>
        <button type="button" class="icon-btn" :aria-label="isFullscreen ? 'ចេញពីពេញអេក្រង់' : 'ពេញអេក្រង់'" aria-keyshortcuts="f" @click="toggleFullscreen">
          <AppIcon :name="isFullscreen ? 'collapse' : 'expand'" :size="20" />
        </button>
      </div>
    </div>

    <button v-if="showSkipRecap && !moreOpen" type="button" class="skip-recap" @click.stop="skipRecap">
      <AppIcon name="skip" :size="16" />រំលងសង្ខេប
    </button>

    <ReportDialog v-if="reporting" :series-id="movie.id" :ep="ep" :time="current" @close="reporting = false" />

    <!-- Hidden warm-up of the next episode -->
    <video v-if="preloadNext && nextSource" class="warm" :src="nextSource.src" preload="auto" muted aria-hidden="true" tabindex="-1" />

    <!-- Episode sheet (phones) -->
    <dialog ref="sheet" class="sheet" aria-labelledby="sheet-title" @click.self="sheet?.close()">
      <div class="sheet-body">
        <div class="grabber" aria-hidden="true" />
        <div class="sheet-head">
          <h2 id="sheet-title">{{ movie.title }}</h2>
          <button type="button" class="icon-btn" aria-label="បិទ" @click="sheet?.close()">
            <AppIcon name="close" :size="20" />
          </button>
        </div>
        <EpisodeGrid :movie="movie" :current="ep" compact />
      </div>
    </dialog>
  </div>
</template>

<style scoped>
.player {
  position: relative;
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
  border-radius: 16px;
  background: #000;
  color: #fff;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.4);
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.player.fullscreen {
  border-radius: 0;
}

.player.pseudo {
  position: fixed;
  inset: 0;
  z-index: 95;
  width: 100vw;
  height: 100dvh;
  aspect-ratio: auto;
  box-shadow: none;
}

.player.hide-ui {
  cursor: none;
}

.video {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  background: #000;
}

.video::cue {
  font-family: var(--font-ui);
  font-size: 1.05em;
  line-height: 1.6;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
}

.surface {
  position: absolute;
  inset: 0;
  z-index: 1;
  /* Swipes and taps are handled here; don't scroll the page behind */
  touch-action: none;
}

/* ---- Top bar ---- */
.top {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  z-index: 3;
  display: none;
  align-items: center;
  gap: 4px;
  padding: calc(8px + env(safe-area-inset-top)) 12px 24px 4px;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.7), transparent);
  transition: opacity 0.25s;
}

.top-title {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.top-title strong {
  overflow: hidden;
  font-size: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.top-title span {
  color: rgba(255, 255, 255, 0.8);
  font-size: 13px;
}

/* ---- Buttons ---- */
.icon-btn {
  display: grid;
  place-items: center;
  min-width: 44px;
  height: 44px;
  border-radius: 50%;
  color: #fff;
}

.icon-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
}

.icon-btn:disabled {
  opacity: 0.35;
  cursor: default;
}

.icon-btn.text {
  padding: 0 10px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  opacity: 0.6;
}

.icon-btn.text[aria-pressed='true'] {
  opacity: 1;
  box-shadow: inset 0 -2px 0 #fff;
}

.btn-glass {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
}

.btn-glass:hover {
  background: rgba(255, 255, 255, 0.28);
}

.big-play {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  color: #fff;
  transform: translate(-50%, -50%);
  backdrop-filter: blur(8px);
}

.big-play:hover {
  background: rgba(0, 0, 0, 0.65);
}

.spinner {
  position: absolute;
  top: 50%;
  left: 50%;
  z-index: 2;
  width: 48px;
  height: 48px;
  margin: -24px 0 0 -24px;
  border: 3px solid rgba(255, 255, 255, 0.25);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.skip {
  position: absolute;
  top: 50%;
  z-index: 2;
  padding: 10px 18px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.55);
  font-weight: 700;
  transform: translateY(-50%);
  pointer-events: none;
}

.skip.left {
  left: 12%;
}

.skip.right {
  right: 12%;
}

/* ---- Overlays ---- */
.overlay {
  position: absolute;
  inset: 0;
  z-index: 4;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  padding: 24px;
  background: rgba(0, 0, 0, 0.62);
  text-align: center;
}

.eyebrow {
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
}

.next-title {
  font-size: 22px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
}

.ring {
  --p: 0;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: conic-gradient(#fff calc(var(--p) * 360deg), rgba(255, 255, 255, 0.2) 0);
  transition: --p 1s linear;
}

.ring span {
  display: grid;
  place-items: center;
  width: 54px;
  height: 54px;
  border-radius: 50%;
  background: #111;
  font-size: 22px;
  font-weight: 700;
}

.next-series {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 16px 10px 10px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.12);
  text-align: left;
}

.next-series:hover {
  background: rgba(255, 255, 255, 0.2);
}

.next-series img {
  width: 56px;
  aspect-ratio: 5 / 7;
  object-fit: cover;
  border-radius: 8px;
}

.next-series span {
  display: flex;
  flex-direction: column;
}

.next-series small {
  color: rgba(255, 255, 255, 0.75);
}

/* ---- Bottom controls ---- */
.controls {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 3;
  padding: 28px 12px calc(6px + env(safe-area-inset-bottom));
  background: linear-gradient(180deg, transparent, rgba(0, 0, 0, 0.75));
  transition: opacity 0.25s;
}

.hide-ui .controls,
.hide-ui .top {
  opacity: 0;
  pointer-events: none;
}

.scrub {
  position: relative;
  height: 20px;
  margin: 0 6px;
}

.buffer {
  position: absolute;
  top: 8px;
  left: 0;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.35);
  pointer-events: none;
}

.scrub input {
  --fill: 0%;
  position: absolute;
  inset: 0;
  width: 100%;
  margin: 0;
  background: transparent;
  cursor: pointer;
  appearance: none;
}

.scrub input::-webkit-slider-runnable-track {
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--accent) var(--fill), rgba(255, 255, 255, 0.2) var(--fill));
}

.scrub input::-moz-range-track {
  height: 4px;
  border-radius: 2px;
  background: linear-gradient(90deg, var(--accent) var(--fill), rgba(255, 255, 255, 0.2) var(--fill));
}

.scrub input::-webkit-slider-thumb {
  width: 14px;
  height: 14px;
  margin-top: -5px;
  border: 0;
  border-radius: 50%;
  background: #fff;
  appearance: none;
}

.scrub input::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border: 0;
  border-radius: 50%;
  background: #fff;
}

.bar {
  display: flex;
  align-items: center;
  gap: 2px;
}

.time {
  margin-left: 6px;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.spacer {
  flex: 1;
}

.speed select {
  min-height: 36px;
  padding: 0 6px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.speed select:hover {
  background: rgba(255, 255, 255, 0.14);
}

.speed option {
  color: #000;
}

.phone {
  display: none;
}

.more-wrap {
  position: relative;
}

.more-panel {
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  z-index: 6;
  display: grid;
  min-width: 230px;
  padding: 6px;
  border-radius: 14px;
  background: rgba(24, 24, 28, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.12);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.5);
}

.more-panel > button,
.more-panel .sleep {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  color: #fff;
  font-size: 14px;
  text-align: left;
}

.more-panel > button:hover,
.more-panel .sleep:hover {
  background: rgba(255, 255, 255, 0.1);
}

.sleep select {
  margin-left: auto;
  padding: 4px 6px;
  border: 0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font: inherit;
}

.sleep option {
  color: #000;
}

.skip-recap {
  position: absolute;
  right: 16px;
  bottom: 84px;
  z-index: 4;
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.92);
  color: #000;
  font-size: 14px;
  font-weight: 600;
}

.skip-recap:hover {
  background: #fff;
}

.warm {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

/* ---- Episode sheet ---- */
.sheet {
  width: 100%;
  max-width: 560px;
  max-height: 70dvh;
  margin: auto auto 0;
  padding: 0;
  border: 0;
  border-radius: 20px 20px 0 0;
  background: var(--bg-elev);
  color: var(--text);
}

.sheet::backdrop {
  background: rgba(0, 0, 0, 0.5);
}

.sheet-body {
  padding: 8px 16px calc(20px + env(safe-area-inset-bottom));
}

.grabber {
  width: 40px;
  height: 5px;
  margin: 0 auto 8px;
  border-radius: 3px;
  background: var(--border);
}

.sheet-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.sheet-head h2 {
  margin: 0;
  overflow: hidden;
  color: var(--text-strong);
  font-size: 17px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sheet-head .icon-btn {
  color: var(--text);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .spinner {
    animation: none;
    border-top-color: rgba(255, 255, 255, 0.25);
  }
}

/* ---- Phones: vertical, immersive, edge to edge ---- */
@media (max-width: 768px) {
  .player {
    position: fixed;
    inset: 0;
    z-index: 80;
    height: 100dvh;
    aspect-ratio: auto;
    border-radius: 0;
    box-shadow: none;
  }

  .top {
    display: flex;
  }

  .desk {
    display: none;
  }

  .phone {
    display: grid;
  }

  .controls {
    padding-bottom: calc(12px + env(safe-area-inset-bottom));
  }
}
</style>
