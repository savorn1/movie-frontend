<script setup lang="ts">
import { shareImage } from '#shared/data/movies'

const route = useRoute()
const { find, byCategory } = useCatalog()
const movie = computed(() => find(Number(route.params.id)))

if (!movie.value) {
  throw createError({ statusCode: 404, message: 'រកមិនឃើញរឿងនេះទេ' })
}

const { lastEpisode, markSeen } = useLibrary()
// movie-api series: this viewer's episodes (what they've unlocked, titles and thumbnails for the grid)
const { reload: reloadEpisodes } = useSeriesEpisodes()
const { viewer } = useViewer()
const loadEpisodes = () => movie.value?.remote && reloadEpisodes(movie.value.id).catch(() => {})
onMounted(() => {
  markSeen(movie.value!.id)
  loadEpisodes()
})
watch(() => viewer.value?.id, loadEpisodes)
const { share } = useShare()
const ambient = useAmbientColor(() => movie.value?.poster)

const related = computed(() => byCategory(movie.value!.category).filter(m => m.id !== movie.value!.id))
const resumeEp = computed(() => lastEpisode(movie.value!.id))
const expanded = ref(false)
const descEl = ref<HTMLElement>()
const clamped = ref(false)
function measure() {
  const el = descEl.value
  if (el && !expanded.value) clamped.value = el.scrollHeight > el.clientHeight + 1
}
onMounted(() => {
  measure()
  window.addEventListener('resize', measure)
})
onBeforeUnmount(() => window.removeEventListener('resize', measure))

// Artwork that fails to load (or failed before hydration) becomes a tinted tile with the title
const posterEl = ref<HTMLImageElement>()
const posterFailed = ref(false)
onMounted(() => {
  const el = posterEl.value
  if (el?.complete && !el.naturalWidth) posterFailed.value = true
})

/*
 * Phones: once the big Play button scrolls away, a slim Play bar stays above the tab bar so the
 * episode list never strands the viewer. Not while the corner player is showing (it plays already).
 */
const playBtn = ref<{ $el: HTMLElement }>()
const dock = ref<HTMLElement>()
const playOffscreen = ref(false)
const { state: miniState } = useMiniPlayer()
const dockShown = computed(() => playOffscreen.value && !miniState.value)
const dockLift = useFloatLift('play-dock')
let playObserver: IntersectionObserver | undefined
onMounted(() => {
  const el = playBtn.value?.$el
  if (!el || !('IntersectionObserver' in window)) return
  playObserver = new IntersectionObserver(([e]) => {
    playOffscreen.value = !!e && !e.isIntersecting && e.boundingClientRect.top < 0 && window.matchMedia('(max-width: 640px)').matches
  })
  playObserver.observe(el)
})
onBeforeUnmount(() => playObserver?.disconnect())
watch([dockShown, dock], async () => {
  await nextTick()
  dockLift.set(dockShown.value && dock.value ? dock.value.offsetHeight : 0)
})

// Shown as the Telegram / Facebook preview: artwork, Khmer title with episode count, genres
usePageMeta(() => ({
  title: `${movie.value!.title} · ${kh(movie.value!.episodes)} វគ្គ`,
  description: `${movie.value!.genres.join(' · ')} — ${movie.value!.description}`,
  image: shareImage(movie.value!),
  imageAlt: movie.value!.title,
  type: 'video.tv_show'
}))

// Structured data so search engines understand this is a series
const site = useRuntimeConfig().public.siteUrl.replace(/\/$/, '')
useHead({
  script: [{
    key: 'ld-series',
    type: 'application/ld+json',
    innerHTML: () => JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'TVSeries',
      'name': movie.value!.title,
      'description': movie.value!.description,
      'image': shareImage(movie.value!),
      'url': `${site}/detail/${movie.value!.id}`,
      'numberOfEpisodes': movie.value!.episodes,
      'genre': movie.value!.genres,
      'inLanguage': 'km',
      'countryOfOrigin': { '@type': 'Country', 'name': 'China' },
      'isAccessibleForFree': !movie.value!.vip
    })
  }]
})
</script>

<template>
  <div v-if="movie" class="page" :style="{ '--ambient': ambient }">
    <!-- Cinematic backdrop tinted with the poster's own color -->
    <div class="backdrop" aria-hidden="true">
      <div class="backdrop-img" :style="{ backgroundImage: `url(${movie.banner})` }" />
    </div>

    <section class="detail">
      <div v-if="posterFailed" class="poster fallback" role="img" :aria-label="movie.title">
        <span>{{ movie.title }}</span>
      </div>
      <img
        v-else
        ref="posterEl"
        :src="imgSrc(movie.poster, 240)"
        :srcset="imgSrcset(movie.poster, 240)"
        :alt="movie.title"
        class="poster"
        @error="posterFailed = true"
      >
      <div class="info cascade">
        <h1 class="display">{{ movie.title }}</h1>
        <p class="meta">
          <span v-if="movie.vip" class="vip-badge">VIP</span>
          {{ kh(movie.year) }} · {{ movie.region }} · {{ kh(movie.episodes) }} វគ្គ
          <span class="status" :class="movie.status">{{ movie.status === 'ongoing' ? 'កំពុងចាក់' : 'ចប់ហើយ' }}</span>
        </p>
        <div class="tags">
          <NuxtLink v-for="g in movie.genres" :key="g" :to="{ path: '/search', query: { wd: g } }">{{ g }}</NuxtLink>
        </div>
        <p ref="descEl" class="desc" :class="{ expanded }">{{ movie.description }}</p>
        <button v-if="clamped" type="button" class="more" :aria-expanded="expanded" @click="expanded = !expanded">
          {{ expanded ? 'បង្ហាញតិច' : 'អានបន្ថែម' }}
        </button>

        <div class="actions">
          <NuxtLink ref="playBtn" :to="`/watch/${movie.id}/${resumeEp ?? 1}`" class="btn btn-primary play">
            <AppIcon name="play" :size="18" />
            <ClientOnly fallback="ចាក់វគ្គ ១">{{ resumeEp ? `បន្តមើលវគ្គ ${kh(resumeEp)}` : 'ចាក់វគ្គ ១' }}</ClientOnly>
          </NuxtLink>
          <ClientOnly>
            <FollowButton :movie="movie" />
            <SaveButton :movie-id="movie.id" />
          </ClientOnly>
          <ActionButton icon="share" label="ចែករំលែក" @click="share(movie.title, `/detail/${movie.id}`)" />
        </div>

        <ClientOnly>
          <NextEpisode v-if="movie.nextEpisodeAt" :at="movie.nextEpisodeAt" :episode="movie.episodes + 1" />
        </ClientOnly>

        <p v-if="movie.vip" class="vip-note">
          វគ្គ ១–{{ kh(movie.freeEpisodes) }} មើលដោយឥតគិតថ្លៃ។ វគ្គបន្ទាប់ត្រូវការ
          <NuxtLink to="/vip">សមាជិក VIP</NuxtLink>។
        </p>
      </div>
    </section>

    <section class="block">
      <h2>វគ្គទាំងអស់ <span>{{ kh(movie.episodes) }}</span></h2>
      <ClientOnly>
        <EpisodeGrid :movie="movie" :current="resumeEp" />
        <template #fallback>
          <EpisodeGrid :movie="movie" />
        </template>
      </ClientOnly>
    </section>

    <MovieRow v-if="related.length" title="រឿងស្រដៀងគ្នា" :items="related" small />

    <ClientOnly>
      <Transition name="dock">
        <div v-if="dockShown" ref="dock" class="play-dock">
          <span class="dock-text">
            <strong>{{ movie.title }}</strong>
            <small>{{ resumeEp ? `បន្តពីវគ្គ ${kh(resumeEp)}` : `${kh(movie.episodes)} វគ្គ` }}</small>
          </span>
          <NuxtLink :to="`/watch/${movie.id}/${resumeEp ?? 1}`" class="btn btn-primary">
            <AppIcon name="play" :size="16" />{{ resumeEp ? 'បន្តមើល' : 'ចាក់' }}
          </NuxtLink>
        </div>
      </Transition>
    </ClientOnly>
  </div>
</template>

<style scoped>
.page {
  position: relative;
  isolation: isolate;
  padding: 40px 32px 0;
}

.backdrop {
  position: absolute;
  z-index: -1;
  inset: -64px 0 auto;
  height: 520px;
  overflow: hidden;
  pointer-events: none;
}

.backdrop-img {
  position: absolute;
  inset: 0;
  background: center 30% / cover no-repeat;
  filter: blur(28px) saturate(1.2);
  opacity: 0.35;
  transform: scale(1.15);
}

:root[data-theme='light'] .backdrop-img {
  display: none;
}

.backdrop::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 70% 80% at 20% 30%, rgb(var(--ambient) / calc(var(--ambient-alpha) * 1.2)), transparent 70%),
    linear-gradient(180deg, transparent 30%, var(--bg) 100%);
}

@media (prefers-reduced-transparency: reduce) {
  .backdrop-img {
    display: none;
  }
}

.detail {
  position: relative;
  display: flex;
  gap: 32px;
  margin-bottom: 40px;
}

.poster {
  width: 240px;
  flex-shrink: 0;
  aspect-ratio: 5 / 7;
  object-fit: cover;
  border-radius: 16px;
  background: var(--bg-elev-2);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}

.poster.fallback {
  display: grid;
  place-items: center;
  padding: 16px;
  background:
    radial-gradient(circle at 30% 20%, rgb(var(--ambient) / 0.55), transparent 70%),
    linear-gradient(160deg, var(--bg-elev-2), var(--bg-elev));
  color: var(--text-strong);
  font-family: var(--font-display);
  font-size: 22px;
  line-height: 1.4;
  text-align: center;
}

/* Slim Play bar on phones once the big button has scrolled away */
.play-dock {
  position: fixed;
  left: 12px;
  right: 12px;
  bottom: var(--float-base);
  z-index: 58;
  transition: bottom var(--dur) var(--ease-out);
  display: none;
  align-items: center;
  gap: 12px;
  padding: 8px 8px 8px 16px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--bg-elev);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
}

.dock-text {
  display: grid;
  flex: 1;
  min-width: 0;
  text-align: left;
}

.dock-text strong {
  overflow: hidden;
  color: var(--text-strong);
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dock-text small {
  color: var(--text-muted);
  font-size: 13px;
}

.play-dock .btn {
  min-height: 44px;
  padding: 0 18px;
  white-space: nowrap;
}

.dock-enter-active {
  transition: opacity var(--dur) var(--ease-out), transform var(--dur) var(--ease-out);
}

.dock-leave-active {
  transition: opacity var(--dur-fast) var(--ease-in), transform var(--dur-fast) var(--ease-in);
}

.dock-enter-from,
.dock-leave-to {
  opacity: 0;
  transform: translateY(16px);
}

.info {
  min-width: 0;
  padding-top: 8px;
}

h1 {
  margin: 0 0 8px;
  color: var(--text-strong);
  font-size: clamp(28px, 3.4vw, 40px);
}

.status {
  padding: 0 8px;
  border-radius: 6px;
  background: var(--bg-elev-2);
  font-size: 13px;
}

.status.ongoing {
  color: #33c46a;
}

:root[data-theme='light'] .status.ongoing {
  color: #137a3a;
}

.meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  color: var(--text-muted);
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.tags a {
  min-height: 32px;
  padding: 3px 12px;
  border-radius: 999px;
  background: var(--bg-elev-2);
  font-size: 13px;
}

.tags a:hover {
  background: var(--bg-hover);
}

.desc {
  display: -webkit-box;
  max-width: 640px;
  margin: 0;
  overflow: hidden;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}

.desc.expanded {
  display: block;
}

.more {
  min-height: 36px;
  padding: 0;
  color: var(--text-strong);
  font-size: 14px;
  font-weight: 600;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
}

.play {
  min-height: 48px;
  padding: 0 28px;
  font-size: 16px;
}

.vip-note {
  margin: 14px 0 0;
  color: var(--text-muted);
  font-size: 14px;
}

.vip-note a {
  color: var(--accent-text);
  font-weight: 600;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.block {
  position: relative;
  margin-bottom: 40px;
}

.block h2 {
  margin: 0 0 14px;
  color: var(--text-strong);
  font-size: 21px;
}

.block h2 span {
  margin-left: 6px;
  color: var(--text-muted);
  font-size: 15px;
  font-weight: 500;
}

@media (max-width: 640px) {
  .page {
    padding: 16px 16px 0;
  }

  .backdrop {
    inset: -56px 0 auto;
    height: 420px;
  }

  .detail {
    flex-direction: column;
    align-items: center;
    gap: 16px;
    text-align: center;
  }

  /* Smaller artwork so the episode list starts higher up */
  .poster {
    width: 132px;
  }

  .poster.fallback {
    font-size: 17px;
  }

  .play-dock {
    display: flex;
  }

  .meta,
  .tags,
  .actions {
    justify-content: center;
  }

  .play {
    flex: 1 0 100%;
  }

  .desc {
    margin: 0 auto;
  }
}

/* The poster tapped on the previous page grows into this one (usePosterMorph) */
.detail .poster {
  view-transition-name: poster;
}
</style>
