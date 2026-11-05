<script setup lang="ts">
import type { Movie } from '#shared/data/movies'

defineProps<{
  title: string
  more?: string
  items: Movie[]
  small?: boolean
  hot?: boolean
  /** Column width of the horizontal strip, desktop / phone */
  col?: [number, number]
}>()

// Arrow buttons for the horizontal row, shown only when there is more to scroll to.
const track = ref<HTMLElement>()
const canPrev = ref(false)
const canNext = ref(false)

function update() {
  const el = track.value
  if (!el) return
  canPrev.value = el.scrollLeft > 4
  canNext.value = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}

function scrollBy(dir: 1 | -1) {
  const el = track.value
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? 'auto' : 'smooth' })
}

onMounted(() => {
  update()
  window.addEventListener('resize', update)
})
onBeforeUnmount(() => window.removeEventListener('resize', update))
</script>

<template>
  <section class="module">
    <div class="heading">
      <AppIcon v-if="hot" name="fire" class="hot-icon" />
      <h2>
        <NuxtLink v-if="more" :to="more">{{ title }}</NuxtLink>
        <template v-else>{{ title }}</template>
      </h2>
      <NuxtLink v-if="more" :to="more" class="more">
        មើលទាំងអស់<AppIcon name="chevron-right" :size="14" />
      </NuxtLink>
    </div>

    <div
      class="track-wrap"
      :class="{ small }"
      :style="col && { '--col': `${col[0]}px`, '--col-sm': `${col[1]}px` }"
    >
      <div ref="track" class="items cascade" :class="{ small }" @scroll.passive="update">
        <slot>
          <PosterCard v-for="(m, i) in items" :key="m.id" :movie="m" :eager="i < 4" />
        </slot>
      </div>
      <template v-if="small">
        <button v-show="canPrev" type="button" class="arrow left" aria-label="រំកិលទៅឆ្វេង" @click="scrollBy(-1)">
          <AppIcon name="chevron-left" />
        </button>
        <button v-show="canNext" type="button" class="arrow right" aria-label="រំកិលទៅស្តាំ" @click="scrollBy(1)">
          <AppIcon name="chevron-right" />
        </button>
      </template>
    </div>
  </section>
</template>

<style scoped>
.module {
  margin-bottom: 40px;
}

.heading {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.hot-icon {
  color: var(--signal);
}

h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 21px;
  font-weight: 700;
}

.more {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-height: 44px;
  margin-left: auto;
  color: var(--text-muted);
  font-size: 14px;
}

.more:hover {
  color: var(--text-strong);
}

.track-wrap {
  position: relative;
}

.items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px 16px;
}

/* Horizontal strip: native scroll on touch, arrow buttons for mouse and keyboard */
.items.small {
  grid-auto-flow: column;
  grid-template-columns: none;
  grid-auto-columns: var(--col, 136px);
  overflow-x: auto;
  padding: 2px 2px 6px;
  scroll-snap-type: x mandatory;
  scrollbar-width: none;
}

.items.small::-webkit-scrollbar {
  display: none;
}

.items.small > :deep(*) {
  scroll-snap-align: start;
}

.arrow {
  position: absolute;
  top: calc(var(--col, 136px) * 0.7 - 22px);
  z-index: 3;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--bg-elev);
  border: 1px solid var(--border);
  color: var(--text-strong);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}

.arrow:hover {
  background: var(--bg-hover);
}

.arrow.left {
  left: -14px;
}

.arrow.right {
  right: -14px;
}

@media (hover: none) {
  .arrow {
    display: none;
  }
}

@media (max-width: 768px) {
  .items {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px 10px;
  }

  .items.small {
    grid-auto-columns: var(--col-sm, 112px);
  }

  .arrow {
    display: none;
  }

  h2 {
    font-size: 18px;
  }
}
</style>
