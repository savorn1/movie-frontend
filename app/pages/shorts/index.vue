<script setup lang="ts">

definePageMeta({ hideFooter: true, immersive: true })
usePageMeta({ title: 'ខ្លីៗ', description: 'អូសមើលរឿងភាគខ្លីៗ ហើយចាប់ផ្តើមមើលពេញរឿងភ្លាមៗ។' })

const { hotWeek: feed } = useCatalog()
const { isSaved, toggleSave } = useSaveToggle()
const { share } = useShare()

const scroller = ref<HTMLElement>()
const slides = ref<HTMLElement[]>([])
const active = ref(0)

function goTo(i: number) {
  const n = Math.max(0, Math.min(feed.value.length - 1, i))
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  slides.value[n]?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
}

function onKey(e: KeyboardEvent) {
  if ((e.target as HTMLElement).closest('input, textarea')) return
  if (e.key === 'ArrowDown' || e.key === 'j') {
    e.preventDefault()
    goTo(active.value + 1)
  } else if (e.key === 'ArrowUp' || e.key === 'k') {
    e.preventDefault()
    goTo(active.value - 1)
  }
}

let observer: IntersectionObserver | undefined
onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (e.isIntersecting) active.value = Number((e.target as HTMLElement).dataset.index)
    }
  }, { root: scroller.value, threshold: 0.6 })
  slides.value.forEach(el => observer!.observe(el))
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  observer?.disconnect()
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="shorts">
    <h1 class="sr-only">ខ្លីៗ</h1>
    <!-- Phones: the header and tab bar are hidden here, so give a way back -->
    <NuxtLink to="/" class="back" aria-label="ត្រឡប់ទៅទំព័រដើម">
      <AppIcon name="chevron-left" :size="24" />
    </NuxtLink>
    <div ref="scroller" class="feed" aria-roledescription="feed">
      <article
        v-for="(m, i) in feed"
        :key="m.id"
        ref="slides"
        class="slide"
        :data-index="i"
        :aria-setsize="feed.length"
        :aria-posinset="i + 1"
        :aria-label="m.title"
      >
        <div class="frame">
          <img :src="m.vertical" alt="" :loading="i < 2 ? 'eager' : 'lazy'" class="bg">
          <NuxtLink :to="`/watch/${m.id}/1`" class="center-play" :aria-label="`ចាក់ ${m.title} វគ្គ ១`">
            <AppIcon name="play" :size="34" />
          </NuxtLink>

          <div class="info">
            <NuxtLink :to="`/detail/${m.id}`" class="title display">{{ m.title }}</NuxtLink>
            <p class="meta">
              <span v-if="m.vip" class="vip-badge">VIP</span>
              វគ្គ ១ · {{ m.genres[0] }}
            </p>
            <p class="desc">{{ m.description }}</p>
            <NuxtLink :to="`/watch/${m.id}/1`" class="btn btn-primary cta">
              <AppIcon name="play" :size="16" />មើលពេញរឿង · {{ kh(m.episodes) }} វគ្គ
            </NuxtLink>
          </div>

          <div class="rail">
            <ClientOnly>
              <button
                type="button"
                :aria-pressed="isSaved(m.id)"
                :class="{ on: isSaved(m.id) }"
                @click="toggleSave(m.id)"
              >
                <span class="icon"><AppIcon name="heart" :size="24" :solid="isSaved(m.id)" /></span>
                <span>{{ isSaved(m.id) ? 'បានរក្សា' : 'រក្សាទុក' }}</span>
              </button>
            </ClientOnly>
            <button type="button" @click="share(m.title, `/detail/${m.id}`)">
              <span class="icon"><AppIcon name="share" :size="22" /></span>
              <span>ចែករំលែក</span>
            </button>
            <NuxtLink :to="`/detail/${m.id}`">
              <span class="icon"><AppIcon name="list" :size="22" /></span>
              <span>វគ្គ</span>
            </NuxtLink>
          </div>
        </div>
      </article>
    </div>

    <div class="stepper">
      <button type="button" aria-label="រឿងមុន" :disabled="active === 0" @click="goTo(active - 1)">
        <AppIcon name="chevron-up" />
      </button>
      <button type="button" aria-label="រឿងបន្ទាប់" :disabled="active === feed.length - 1" @click="goTo(active + 1)">
        <AppIcon name="chevron-down" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.shorts {
  position: relative;
  --feed-h: calc(100dvh - 64px);
}

.feed {
  height: var(--feed-h);
  overflow-y: auto;
  scroll-snap-type: y mandatory;
  scrollbar-width: none;
  overscroll-behavior: contain;
}

.feed::-webkit-scrollbar {
  display: none;
}

.slide {
  display: grid;
  place-items: center;
  height: var(--feed-h);
  padding: 16px 0;
  scroll-snap-align: start;
  scroll-snap-stop: always;
}

.frame {
  position: relative;
  height: 100%;
  aspect-ratio: 9 / 16;
  max-width: 100%;
  overflow: hidden;
  border-radius: 18px;
  background: #111;
  color: #fff;
}

.frame::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, transparent 25%, transparent 45%, rgba(0, 0, 0, 0.85) 100%);
}

.bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.center-play {
  position: absolute;
  top: 42%;
  left: 50%;
  z-index: 2;
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(6px);
  transform: translate(-50%, -50%);
  transition: transform 0.2s, background 0.2s;
}

.center-play:hover {
  background: rgba(0, 0, 0, 0.55);
  transform: translate(-50%, -50%) scale(1.06);
}

.info {
  position: absolute;
  left: 16px;
  right: 84px;
  bottom: 20px;
  z-index: 2;
}

.title {
  display: block;
  font-size: 24px;
  text-shadow: 0 1px 8px rgba(0, 0, 0, 0.5);
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 4px 0 6px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 14px;
}

.desc {
  display: -webkit-box;
  margin: 0 0 14px;
  overflow: hidden;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.cta {
  width: 100%;
  min-height: 44px;
}

.rail {
  position: absolute;
  right: 10px;
  bottom: 96px;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rail > * {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  width: 64px;
  color: #fff;
  font-size: 13px;
}

.rail .icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(6px);
}

.rail > *:hover .icon {
  background: rgba(0, 0, 0, 0.6);
}

.rail .on .icon {
  color: #ff4d6d;
}

@media (prefers-reduced-transparency: reduce) {
  .center-play,
  .rail .icon {
    background: #2a2a30;
    backdrop-filter: none;
  }
}

.stepper {
  position: absolute;
  right: 32px;
  top: 50%;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transform: translateY(-50%);
}

.stepper button {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  color: var(--text-strong);
}

.stepper button:hover:not(:disabled) {
  background: var(--bg-hover);
}

.stepper button:disabled {
  opacity: 0.35;
  cursor: default;
}

@media (hover: none), (max-width: 1024px) {
  .stepper {
    display: none;
  }
}

@media (max-width: 1024px) {
  .shorts {
    --feed-h: calc(100dvh - 64px - 60px - env(safe-area-inset-bottom));
  }
}

.back {
  display: none;
}

/* Phones: full screen, edge-to-edge cards */
@media (max-width: 768px) {
  .shorts {
    --feed-h: 100dvh;
  }

  .back {
    position: fixed;
    top: calc(10px + env(safe-area-inset-top));
    left: 10px;
    z-index: 10;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.4);
    color: #fff;
    backdrop-filter: blur(6px);
  }

  .info {
    bottom: calc(20px + env(safe-area-inset-bottom));
  }

  .slide {
    padding: 0;
  }

  .frame {
    width: 100%;
    aspect-ratio: auto;
    border-radius: 0;
  }
}
</style>
