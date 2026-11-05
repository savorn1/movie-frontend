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
/** Playing the free opening of a locked episode: stop at `seconds` and show the wall over that frame */
const preview = ref<{ seconds: number; done: boolean } | null>(null)
/** After unlocking from a preview, carry on from where it stopped */
let continueFrom = 0
const previewLeft = computed(() => (preview.value ? Math.max(0, Math.ceil(preview.value.seconds - current.value)) : 0))
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
  // The full player takes over from the corner one
  mini.close()
  hls?.destroy()
  hls = null
  ended.value = false
  countdown.value = null
  needsTap.value = false
  current.value = 0
  duration.value = 0

  const teaser = props.movie.previews?.[props.ep]
  if (!canWatch(props.movie, props.ep) && teaser) {
    wallEp.value = null
    preview.value = { seconds: teaser.seconds, done: false }
    el.src = teaser.url
    el.playbackRate = el.defaultPlaybackRate = prefs.value.speed
    play()
    return
  }
  preview.value = null
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
  const el = video.value
  if (!el) return
  duration.value = el.duration
  applyCaptions()
  if (preview.value) return
  if (continueFrom > 0 && continueFrom < el.duration - 1) {
    el.currentTime = continueFrom
    continueFrom = 0
    return
  }
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
  // Can fire while the page is being left
  const el = video.value
  if (!el) return
  current.value = el.currentTime
  if (el.buffered.length) bufferedEnd.value = el.buffered.end(el.buffered.length - 1)
  if (preview.value) {
    // The opening is over (or was skipped past): pause on this frame and offer to unlock
    if (!preview.value.done && el.currentTime >= preview.value.seconds) {
      el.pause()
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
      preview.value = { ...preview.value, done: true }
      wallEp.value = props.ep
    }
    return
  }
  if (Date.now() - lastSave > 3000) persist()
  if (el.duration && el.currentTime / el.duration >= 0.9) {
    track(props.movie.id, props.ep, 'complete')
    reportFinished()
  }
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
  if (!el || !el.duration || wallEp.value || preview.value) return
  lastSave = Date.now()
  saveProgress(props.movie.id, props.ep, el.currentTime, el.duration)
}

// ---------- Auto-advance ----------
let tick: ReturnType<typeof setInterval> | undefined

// Finished episodes count for today's missions and for invite rewards (signed-in viewers, real series)
const { viewer: signedIn } = useViewer()
const missionState = useState<unknown[] | null>('missions', () => null)
let reportedFor = ''
function reportFinished() {
  const key = `${props.movie.id}:${props.ep}`
  if (!signedIn.value || !props.movie.remote || reportedFor === key) return
  reportedFor = key
  $fetch<{ missions: unknown[] }>('/api/missions/watch', { method: 'POST', body: { seriesId: props.movie.id, episode: props.ep } })
    .then(r => (missionState.value = r.missions))
    .catch(() => (reportedFor = ''))
}

// After episode 3 a viewer is hooked: offer new-episode alerts once per series (not before, when
// a permission prompt would just be dismissed)
const followSeries = useFollowSeries()
function nudgeFollow() {
  if (props.ep !== 3 || followSeries.isFollowing(props.movie.id) || props.movie.status === 'completed') return
  const key = `rf-nudged-${props.movie.id}`
  try {
    if (localStorage.getItem(key)) return
    localStorage.setItem(key, '1')
  } catch {
    // Storage blocked: nudging again later is harmless
  }
  show('ចូលចិត្តរឿងនេះ? តាមដានដើម្បីដឹងពេលវគ្គថ្មីចេញ', { label: 'តាមដាន', run: () => followSeries.follow(props.movie) })
}

function onEnded() {
  playing.value = false
  if (preview.value) {
    // A preview shorter than its limit (a short episode): the wall for this episode, not the next
    preview.value = { ...preview.value, done: true }
    wallEp.value = props.ep
    return
  }
  ended.value = true
  persist()
  nudgeFollow()
  const n = nextEp.value
  if (!n) return
  if (sleep.stopAtEpisodeEnd.value) {
    sleep.clear()
    show('ម៉ោងគេង៖ ឈប់បន្ទាប់ពីវគ្គនេះ')
    return
  }
  if (!canWatch(props.movie, n) && !props.movie.previews?.[n]) {
    // Cliffhanger wall over the frozen last frame (an episode with a free opening plays that instead)
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
  loadReactions()
})

// ---------- Reactions on the timeline (movie-api series) ----------
const REACTION_EMOJI = { laugh: '😂', cry: '😭', fire: '🔥', love: '😍' } as const
type ReactionKind = keyof typeof REACTION_EMOJI
const REACTION_LABELS: Record<ReactionKind, string> = { laugh: 'សើច', cry: 'យំ', fire: 'ក្តៅគគុក', love: 'ស្រលាញ់' }
const reactions = ref<{ bucket: number; kind: ReactionKind; count: number }[]>([])
const floating = ref<{ id: number; emoji: string; x: number }[]>([])
let lastReaction = 0
let floatId = 0

async function loadReactions() {
  reactions.value = []
  if (!props.movie.remote) return
  try {
    reactions.value = await $fetch(`/api/reactions`, { query: { series: props.movie.id, ep: props.ep } })
  } catch {
    // Extra: the episode still plays
  }
}

/** The busiest moments: up to 6 buckets, each shown with its most used emoji */
const hotMoments = computed(() => {
  if (!duration.value) return []
  const byBucket = new Map<number, { total: number; top: ReactionKind; topCount: number }>()
  for (const r of reactions.value) {
    const b = byBucket.get(r.bucket) ?? { total: 0, top: r.kind, topCount: 0 }
    b.total += r.count
    if (r.count > b.topCount) Object.assign(b, { top: r.kind, topCount: r.count })
    byBucket.set(r.bucket, b)
  }
  return [...byBucket.entries()]
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6)
    .map(([bucket, b]) => ({ bucket, at: Math.min(100, ((bucket * 5 + 2.5) / duration.value) * 100), emoji: REACTION_EMOJI[b.top], total: b.total }))
    .filter(m => m.at <= 100)
})

async function react(kind: ReactionKind) {
  // One every 1.5 s per viewer: taps faster than that only animate
  const now = Date.now()
  const counted = now - lastReaction > 1500
  const id = ++floatId
  floating.value = [...floating.value.slice(-6), { id, emoji: REACTION_EMOJI[kind], x: 10 + Math.random() * 40 }]
  setTimeout(() => (floating.value = floating.value.filter(f => f.id !== id)), 1600)
  haptic('tap')
  reveal()
  if (!counted) return
  lastReaction = now
  const second = Math.floor(current.value)
  const bucket = Math.floor(second / 5)
  const existing = reactions.value.find(r => r.bucket === bucket && r.kind === kind)
  if (existing) existing.count++
  else reactions.value = [...reactions.value, { bucket, kind, count: 1 }]
  $fetch('/api/reactions', { method: 'POST', body: { series: props.movie.id, ep: props.ep, second, kind } }).catch(() => {})
}

// ---------- Frame preview over the progress bar ----------
// Computers with a mouse, MP4 episodes, not in data-saver mode: a small muted copy of the video seeks
// to the hovered moment. Elsewhere (touch, HLS, saving data) only the time shows.
const peek = ref<{ x: number; time: number } | null>(null)
const peekVideo = ref<HTMLVideoElement>()
const canPeekFrames = ref(false)
let peekFrame = 0
function onScrubHover(e: PointerEvent) {
  if (!duration.value) return
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width))
  peek.value = { x: ratio * 100, time: ratio * duration.value }
  if (!canPeekFrames.value || source.value.type !== 'mp4' || saveData.value) return
  cancelAnimationFrame(peekFrame)
  peekFrame = requestAnimationFrame(() => {
    const v = peekVideo.value
    if (v && peek.value && Math.abs(v.currentTime - peek.value.time) > 0.5) v.currentTime = peek.value.time
  })
}

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
  const t = Number((e.target as HTMLInputElement).value)
  if (el) el.currentTime = t
  // Dragging on a phone: show the time above the thumb
  if (duration.value) peek.value = { x: (t / duration.value) * 100, time: t }
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
    c.line = prefs.value.captionPos === 'high' ? -7 : -4
  }
}

// Subtitle look, from the More panel; kept with the other player preferences
const CAPTION_SIZES = [
  { value: 's', label: 'តូច' },
  { value: 'm', label: 'មធ្យម' },
  { value: 'l', label: 'ធំ' },
  { value: 'xl', label: 'ធំណាស់' }
] as const
const CAPTION_BGS = [
  { value: 'none', label: 'គ្មាន' },
  { value: 'soft', label: 'ស្រាល' },
  { value: 'solid', label: 'ដិត' }
] as const
const captionClass = computed(() => [`cap-${prefs.value.captionSize ?? 'm'}`, `cap-bg-${prefs.value.captionBg ?? 'soft'}`])
watch(() => prefs.value.captionPos, liftCues)

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
  canPeekFrames.value = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  loadReactions()
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

// Leaving the watch page while an episode plays: it carries on in the corner (MiniPlayer)
const mini = useMiniPlayer()
onBeforeUnmount(() => {
  persist()
  const el = video.value
  if (el && playing.value && !ended.value && !wallEp.value && !preview.value && canWatch(props.movie, props.ep)) {
    mini.open({
      movieId: props.movie.id,
      ep: props.ep,
      title: props.movie.title,
      poster: props.movie.banner,
      src: source.value.src,
      type: source.value.type,
      time: el.currentTime,
      muted: el.muted
    })
  }
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
  if (preview.value) {
    // Same episode, now paid: the full video, from where the opening stopped
    continueFrom = Math.max(0, current.value - 2)
    load()
  } else if (ended.value && nextEp.value) goEp(nextEp.value)
  else load()
}
</script>

<template>
  <div
    ref="wrap"
    class="player"
    :class="[{ 'hide-ui': !controlsVisible && playing, fullscreen: isFullscreen, pseudo: pseudoFullscreen }, captionClass]"
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

    <span v-if="preview && !preview.done" class="preview-pill" role="status">
      <AppIcon name="lock" :size="13" solid /> មើលសាកល្បង · នៅសល់ {{ kh(previewLeft) }} វិ
    </span>

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
          <img loading="lazy" decoding="async" :src="nextSeries.poster" alt="">
          <span>
            <small>រឿងបន្ទាប់</small>
            <strong>{{ nextSeries.title }}</strong>
          </span>
        </NuxtLink>
        <button type="button" class="btn btn-glass" @click="replay">មើលវគ្គនេះម្តងទៀត</button>
      </template>
    </div>

    <!-- Emoji reactions: tap to react at this moment; busy moments show on the progress bar -->
    <div v-if="movie.remote && !wallEp && !preview" class="react-rail" @click.stop>
      <button v-for="(emoji, kind) in REACTION_EMOJI" :key="kind" type="button" :aria-label="REACTION_LABELS[kind]" @click="react(kind)">
        {{ emoji }}
      </button>
    </div>
    <div class="floaters" aria-hidden="true">
      <span v-for="f in floating" :key="f.id" :style="{ right: `${f.x}px` }">{{ f.emoji }}</span>
    </div>

    <UnlockWall v-if="wallEp" :movie="movie" :ep="wallEp" :previewed="!!preview?.done" @unlocked="onUnlocked" />

    <!-- Bottom controls -->
    <div v-if="!wallEp" class="controls" @click.stop>
      <div class="scrub" @pointermove="onScrubHover" @pointerleave="peek = null" @touchend="peek = null">
        <div class="buffer" :style="{ width: `${duration ? (bufferedEnd / duration) * 100 : 0}%` }" />
        <span
          v-for="m in hotMoments"
          :key="m.bucket"
          class="moment"
          :style="{ left: `${m.at}%` }"
          :title="`${kh(m.total)} reactions`"
          aria-hidden="true"
        >{{ m.emoji }}</span>
        <div v-if="peek" class="peek" :style="{ left: `clamp(60px, ${peek.x}%, calc(100% - 60px))` }" aria-hidden="true">
          <video
            v-if="canPeekFrames && source.type === 'mp4' && !saveData"
            ref="peekVideo"
            :src="source.src"
            muted
            preload="metadata"
            playsinline
            tabindex="-1"
          />
          <span>{{ fmt(peek.time) }}</span>
        </div>
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
            <fieldset class="captions-set">
              <legend>អក្សររត់</legend>
              <label>
                <span>ទំហំ</span>
                <select v-model="prefs.captionSize">
                  <option v-for="o in CAPTION_SIZES" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </label>
              <label>
                <span>ផ្ទៃខាងក្រោយ</span>
                <select v-model="prefs.captionBg">
                  <option v-for="o in CAPTION_BGS" :key="o.value" :value="o.value">{{ o.label }}</option>
                </select>
              </label>
              <label>
                <span>ទីតាំង</span>
                <select v-model="prefs.captionPos">
                  <option value="low">ទាប</option>
                  <option value="high">ខ្ពស់</option>
                </select>
              </label>
            </fieldset>
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

.sleep option,
.captions-set option {
  color: #000;
}

.captions-set {
  display: grid;
  gap: 2px;
  margin: 4px 0;
  padding: 6px 12px 8px;
  border: 0;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
  font-size: 14px;
}

.captions-set legend {
  float: left;
  width: 100%;
  padding: 4px 0;
  color: rgba(255, 255, 255, 0.65);
  font-size: 12px;
}

.captions-set label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 36px;
}

.captions-set select {
  padding: 4px 6px;
  border: 0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font: inherit;
}

/* Subtitle sizes and boxes (::cue can't read variables everywhere, so one rule per choice) */
.cap-s .video::cue {
  font-size: 0.85em;
}

.cap-l .video::cue {
  font-size: 1.35em;
}

.cap-xl .video::cue {
  font-size: 1.7em;
}

.cap-bg-none .video::cue {
  background: transparent;
  text-shadow: 0 0 4px #000, 0 0 2px #000, 0 1px 2px #000;
}

.cap-bg-solid .video::cue {
  background: rgba(0, 0, 0, 0.92);
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
.preview-pill {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 4;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  pointer-events: none;
  padding: 4px 10px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffe26a, #ffb800);
  color: #3a2600;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
}
.moment {
  position: absolute;
  top: -16px;
  z-index: 1;
  font-size: 13px;
  line-height: 1;
  transform: translateX(-50%);
  pointer-events: none;
}

.peek {
  position: absolute;
  bottom: 22px;
  z-index: 2;
  display: grid;
  justify-items: center;
  gap: 4px;
  transform: translateX(-50%);
  pointer-events: none;
}

.peek video {
  width: 160px;
  aspect-ratio: 16 / 9;
  border: 2px solid rgba(255, 255, 255, 0.85);
  border-radius: 8px;
  background: #000;
  object-fit: cover;
}

.peek span {
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.react-rail {
  position: absolute;
  right: 12px;
  bottom: 140px;
  z-index: 4;
  display: grid;
  gap: 6px;
  transition: opacity 0.2s;
}

.react-rail button {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  font-size: 20px;
  line-height: 1;
}

.react-rail button:active {
  transform: scale(1.2);
}

.hide-ui .react-rail {
  opacity: 0;
  pointer-events: none;
}

.floaters {
  position: absolute;
  right: 0;
  bottom: 190px;
  z-index: 4;
  width: 100px;
  height: 0;
  pointer-events: none;
}

.floaters span {
  position: absolute;
  bottom: 0;
  font-size: 28px;
  animation: float-up 1.6s ease-out forwards;
}

@keyframes float-up {
  from {
    transform: translateY(0) scale(0.8);
    opacity: 1;
  }
  to {
    transform: translateY(-180px) scale(1.3);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .floaters {
    display: none;
  }
}
</style>
