<script setup lang="ts">
import type { Movie } from '#shared/data/movies'

const props = defineProps<{ items: Movie[] }>()

const index = ref(0)
const current = computed(() => props.items[index.value]!)
// Data saver: half-size hero images (the seeded image service takes any size)
// (after hydration only: the server can't see the viewer's connection)
const { active: saveData } = useDataSaver()
const hydrated = useHydrated()
// Resized banners: phones get the 960 px one (CSS picks by screen width), Save-Data gets it everywhere
const bannerSmall = (m: Movie) => imgSrc(m.banner, 960)
const bannerLarge = (m: Movie) => (hydrated.value && saveData.value ? bannerSmall(m) : imgSrc(m.banner, 1920))
// The one this screen shows (for the preload / shimmer)
const bannerOf = (m: Movie) => (import.meta.client && window.matchMedia('(max-width: 768px)').matches ? bannerSmall(m) : bannerLarge(m))

// A shimmer until the current banner has arrived (slow connections otherwise see a flat dark box)
const loadedBanners = ref(new Set<string>())
const bannerReady = computed(() => loadedBanners.value.has(bannerOf(current.value)))
function preloadBanner() {
  const url = bannerOf(current.value)
  if (loadedBanners.value.has(url)) return
  const img = new Image()
  const done = () => (loadedBanners.value = new Set([...loadedBanners.value, url]))
  img.onload = done
  img.onerror = done
  img.src = url
}
onMounted(preloadBanner)
watch(() => bannerOf(current.value), () => import.meta.client && preloadBanner())

// The page around the hero takes on the current poster's color
const ambient = useAmbientColor(() => current.value.poster)

// Autoplay stops for Reduce Motion, while hovered or focused, when the tab is hidden,
// and for good once someone presses pause.
const userPaused = ref(false)
const interacting = ref(false)
const reduceMotion = ref(false)
const pageHidden = ref(false)
const playing = computed(() => !userPaused.value && !reduceMotion.value)
const running = computed(() => playing.value && !interacting.value && !pageHidden.value)

let timer: ReturnType<typeof setInterval> | undefined
watch(running, (on) => {
  clearInterval(timer)
  if (on) timer = setInterval(() => step(1), 6000)
})

function go(i: number) {
  const n = props.items.length
  index.value = (i + n) % n
}
const step = (d: number) => go(index.value + d)

function togglePlay() {
  if (reduceMotion.value) reduceMotion.value = false
  userPaused.value = !userPaused.value
}

// Swipe on touch screens
let startX = 0
const onTouchStart = (e: TouchEvent) => (startX = e.touches[0]!.clientX)
function onTouchEnd(e: TouchEvent) {
  const dx = e.changedTouches[0]!.clientX - startX
  if (Math.abs(dx) > 40) step(dx < 0 ? 1 : -1)
}

const onVisibility = () => (pageHidden.value = document.hidden)

onMounted(() => {
  reduceMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.addEventListener('visibilitychange', onVisibility)
  if (running.value) timer = setInterval(() => step(1), 6000)
})
onBeforeUnmount(() => {
  clearInterval(timer)
  document.removeEventListener('visibilitychange', onVisibility)
})
</script>

<template>
  <div class="hero-wrap" :style="{ '--ambient': ambient }">
  <section
    class="hero"
    :class="{ waiting: hydrated && !bannerReady }"
    aria-roledescription="carousel"
    aria-label="រឿងពិសេស"
    @mouseenter="interacting = true"
    @mouseleave="interacting = false"
    @focusin="interacting = true"
    @focusout="interacting = false"
    @touchstart.passive="onTouchStart"
    @touchend="onTouchEnd"
    @keydown.left="step(-1)"
    @keydown.right="step(1)"
  >
    <TransitionGroup name="fade" tag="div" class="slides">
      <div
        v-for="(m, i) in items"
        v-show="i === index"
        :key="m.id"
        class="slide"
        :style="{ '--bg-sm': `url(${bannerSmall(m)})`, '--bg-lg': `url(${bannerLarge(m)})` }"
        role="group"
        aria-roledescription="slide"
        :aria-label="`${i + 1} / ${items.length}`"
      />
    </TransitionGroup>
    <div class="shade" />

    <div class="info" aria-live="polite">
      <h2 class="display">{{ current.title }}</h2>
      <p class="remark">
        <span v-if="current.vip" class="vip-badge">VIP</span>
        {{ current.episode }} · {{ current.genres[0] }}
      </p>
      <p class="desc">{{ current.description }}</p>
      <div class="actions">
        <NuxtLink :to="`/watch/${current.id}/1`" class="btn btn-primary">
          <AppIcon name="play" :size="16" />ចាក់វគ្គ ១
        </NuxtLink>
        <NuxtLink :to="`/detail/${current.id}`" class="btn btn-glass">ព័ត៌មានលម្អិត</NuxtLink>
      </div>
    </div>

    <button class="nav prev" type="button" aria-label="រឿងមុន" @click="step(-1)">
      <AppIcon name="chevron-left" />
    </button>
    <button class="nav next" type="button" aria-label="រឿងបន្ទាប់" @click="step(1)">
      <AppIcon name="chevron-right" />
    </button>

    <div class="controls">
      <button
        type="button"
        class="play-toggle"
        :aria-label="playing ? 'ផ្អាកការបង្ហាញស្វ័យប្រវត្តិ' : 'បន្តការបង្ហាញស្វ័យប្រវត្តិ'"
        @click="togglePlay"
      >
        <AppIcon :name="playing ? 'pause' : 'play'" :size="14" />
      </button>
      <div class="thumbs">
        <button
          v-for="(m, i) in items"
          :key="m.id"
          type="button"
          :class="{ active: i === index }"
          :aria-label="m.title"
          :aria-current="i === index"
          @click="go(i)"
        >
          <img :src="imgSrc(m.poster, 80)" :srcset="imgSrcset(m.poster, 80)" alt="" loading="lazy">
        </button>
      </div>
      <div class="dots" aria-hidden="true">
        <span v-for="(m, i) in items" :key="m.id" :class="{ active: i === index }" />
      </div>
    </div>
  </section>
  <div class="bleed" aria-hidden="true" />
  </div>
</template>

<style scoped>
.hero-wrap {
  position: relative;
}

/* Ambient glow that bleeds from the hero into the rows below */
.bleed {
  position: absolute;
  left: 0;
  right: 0;
  /* Fades in over the hero's bottom edge so there is no seam */
  top: calc(100% - 160px);
  height: 600px;
  z-index: 2;
  -webkit-mask-image: linear-gradient(180deg, transparent, #000 160px);
  mask-image: linear-gradient(180deg, transparent, #000 160px);
  pointer-events: none;
  background: radial-gradient(ellipse 85% 55% at 30% 32%, rgb(var(--ambient) / var(--ambient-alpha)), transparent 70%);
  transition: background 0.8s;
}

.hero {
  z-index: 1;
  position: relative;
  height: min(56vw, 620px);
  min-height: 340px;
  margin-top: -64px;
  overflow: hidden;
  background: #111;
  color: #fff;
}

.slides,
.slide {
  position: absolute;
  inset: 0;
}

.slide {
  background: var(--bg-lg) center / cover no-repeat;
  /* A slow, gentle zoom while a slide is shown (restarts each time it's shown) */
  animation: slow-zoom 12s var(--ease-out) both;
}

@media (max-width: 768px) {
  .slide {
    background-image: var(--bg-sm);
  }
}

@keyframes slow-zoom {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.06);
  }
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.6s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.shade {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.75) 0%, rgba(0, 0, 0, 0) 60%),
    var(--shade) bottom / 100% 40% no-repeat;
}

.info {
  position: absolute;
  left: 40px;
  bottom: 120px;
  max-width: 480px;
}

.info h2 {
  margin: 0 0 8px;
  font-size: clamp(28px, 3.4vw, 44px);
  text-shadow: 0 2px 12px rgba(0, 0, 0, 0.5);
}

.remark {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 10px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.desc {
  margin: 0 0 20px;
  color: rgba(255, 255, 255, 0.85);
}

.actions {
  display: flex;
  gap: 10px;
}

.btn-glass {
  background: rgba(255, 255, 255, 0.18);
  color: #fff;
  backdrop-filter: blur(10px);
}

.btn-glass:hover {
  background: rgba(255, 255, 255, 0.28);
}

@media (prefers-reduced-transparency: reduce) {
  .btn-glass {
    background: #3a3a40;
    backdrop-filter: none;
  }
}

.nav {
  position: absolute;
  top: 45%;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  opacity: 0;
  transition: opacity 0.2s;
}

/* Visible on hover, while anything in the hero has keyboard focus, and always on touch screens */
.hero:hover .nav,
.hero:focus-within .nav {
  opacity: 1;
}

@media (hover: none) {
  .nav {
    opacity: 1;
  }
}

.prev {
  left: 16px;
}

.next {
  right: 16px;
}

.controls {
  position: absolute;
  right: 32px;
  bottom: 32px;
  display: flex;
  align-items: flex-end;
  gap: 12px;
}

.play-toggle {
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
}

.thumbs {
  display: flex;
  gap: 10px;
}

.thumbs button {
  width: 54px;
  aspect-ratio: 5 / 7;
  padding: 0;
  overflow: hidden;
  border-radius: 8px;
  border: 2px solid transparent;
  opacity: 0.6;
  transition: opacity 0.2s, border-color 0.2s, transform 0.2s;
}

.thumbs button:hover {
  opacity: 0.9;
}

.thumbs button.active {
  opacity: 1;
  border-color: #fff;
  transform: translateY(-4px);
}

.thumbs img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.dots {
  display: none;
}

@media (max-width: 768px) {
  .hero {
    margin-top: -56px;
    height: 78vw;
  }

  .info {
    left: 16px;
    right: 16px;
    bottom: 44px;
  }

  .desc {
    display: none;
  }

  .btn {
    min-height: 36px;
    padding: 0 14px;
    font-size: 13px;
  }

  .nav,
  .thumbs {
    display: none;
  }

  .controls {
    left: 16px;
    right: 16px;
    bottom: 14px;
    justify-content: space-between;
    align-items: center;
  }

  .play-toggle {
    order: 2;
    width: 32px;
    height: 32px;
  }

  .dots {
    display: flex;
    gap: 6px;
  }

  .dots span {
    width: 6px;
    height: 6px;
    border-radius: 3px;
    background: rgba(255, 255, 255, 0.45);
    transition: width 0.2s;
  }

  .dots span.active {
    width: 18px;
    background: #fff;
  }
}

/* Banner still loading: a soft moving sheen instead of a flat box */
.hero.waiting::before {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 0;
  background: var(--shimmer);
  background-size: 200% 100%;
  animation: shimmer 1.4s linear infinite;
  opacity: 0.5;
}
</style>
