<script setup lang="ts">
import { shareImage } from '#shared/data/movies'

const route = useRoute()
const { find, byCategory } = useCatalog()
const movie = computed(() => find(Number(route.params.id)))
const ep = computed(() => Number(route.params.ep))

if (!movie.value || !Number.isInteger(ep.value) || ep.value < 1 || ep.value > movie.value.episodes) {
  throw createError({ statusCode: 404, message: 'រកមិនឃើញវគ្គនេះទេ' })
}

// movie-api series load their episode links per series and per viewer (none for VIP episodes they
// haven't paid for); signing in or out asks again
const { reload, episodesOf } = useSeriesEpisodes()
const { viewer } = useViewer()
const { status: episodesStatus, refresh: retryEpisodes } = useAsyncData(
  () => `episodes-${movie.value!.id}`,
  () => reload(movie.value!.id),
  { server: false, immediate: !!movie.value?.remote }
)
watch(() => viewer.value?.id, () => {
  if (movie.value?.remote) retryEpisodes()
})
const playable = computed(() => {
  const m = movie.value!
  if (!m.remote) return m
  const episodes = episodesOf(m.id) ?? []
  const sources = Object.fromEntries(episodes.filter(e => e.videoUrl).map(e => [e.number, e.videoUrl!]))
  const subtitled = Object.fromEntries(episodes.map(e => [e.number, e.hasSubtitles]))
  const previews = Object.fromEntries(episodes.filter(e => e.preview).map(e => [e.number, e.preview!]))
  const dubs = Object.fromEntries(episodes.filter(e => e.dubUrl).map(e => [e.number, e.dubUrl!]))
  return { ...m, sources, subtitled, previews, dubs }
})
const playerReady = computed(() => !movie.value!.remote || episodesStatus.value === 'success')

const { canWatch } = useLibrary()
const { share } = useShare()
const ambient = useAmbientColor(() => movie.value?.poster)

// Shown on the comments button next to Share; tapping it scrolls down to them
const commentCount = ref(0)
watch(ep, () => (commentCount.value = 0))
function toComments() {
  document.getElementById('comments')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
}

const similar = computed(() => byCategory(movie.value!.category).filter(m => m.id !== movie.value!.id))

// Up next: the following episode, or a similar series once this one is finished
const nextEp = computed(() => (ep.value < movie.value!.episodes ? ep.value + 1 : null))
const nextLocked = computed(() => nextEp.value !== null && !canWatch(movie.value!, nextEp.value))
const nextSeries = computed(() => similar.value[0])

usePageMeta(() => ({
  title: `${movie.value!.title} វគ្គ ${kh(ep.value)}`,
  description: `វគ្គ ${kh(ep.value)} នៃ ${kh(movie.value!.episodes)} · ${movie.value!.description}`,
  image: shareImage(movie.value!),
  imageAlt: movie.value!.title,
  type: 'video.episode'
}))
</script>

<template>
  <div v-if="movie" class="page" :style="{ '--ambient': ambient }">
    <div class="layout">
      <div class="main-col">
        <ClientOnly>
          <Transition name="swap" mode="out-in">
          <BingePlayer v-if="playerReady" :movie="playable" :ep="ep" />
          <div v-else-if="episodesStatus === 'error'" class="player-skeleton load-error" role="alert">
            <p>មិនអាចផ្ទុកវគ្គនេះបានទេ។</p>
            <button type="button" class="btn btn-primary" @click="retryEpisodes()">ព្យាយាមម្តងទៀត</button>
          </div>
          <div v-else class="player-skeleton" :style="{ backgroundImage: `url(${movie.banner})` }" />
          </Transition>
          <template #fallback>
            <div class="player-skeleton" :style="{ backgroundImage: `url(${movie.banner})` }" />
          </template>
        </ClientOnly>

        <div class="bar">
          <div class="title-block">
            <h1><NuxtLink :to="`/detail/${movie.id}`">{{ movie.title }}</NuxtLink></h1>
            <p class="ep">វគ្គ {{ kh(ep) }} នៃ {{ kh(movie.episodes) }}</p>
          </div>
          <div class="tools">
            <ClientOnly>
              <FollowButton :movie="movie" />
              <SaveButton :movie-id="movie.id" />
            </ClientOnly>
            <ActionButton
              v-if="movie.remote"
              icon="comment"
              :label="commentCount ? `មតិ ${kh(commentCount)}` : 'មតិ'"
              @click="toComments"
            />
            <ActionButton icon="share" label="ចែករំលែក" @click="share(`${movie.title} វគ្គ ${kh(ep)}`, `/watch/${movie.id}/${ep}`)" />
          </div>
        </div>

        <details class="shortcuts">
          <summary>ផ្លូវកាត់ក្តារចុច</summary>
          <dl>
            <dt>Space / K</dt><dd>ចាក់ / ផ្អាក</dd>
            <dt>← → / J L</dt><dd>ថយ / ទៅមុខ ១០ វិនាទី</dd>
            <dt>N / P</dt><dd>វគ្គបន្ទាប់ / វគ្គមុន</dd>
            <dt>&lt; &gt;</dt><dd>ល្បឿន</dd>
            <dt>C</dt><dd>អក្សររត់</dd>
            <dt>M</dt><dd>បិទ / បើកសំឡេង</dd>
            <dt>F</dt><dd>ពេញអេក្រង់</dd>
          </dl>
        </details>

        <ClientOnly>
          <EpisodeComments v-if="movie.remote" :series-id="movie.id" :ep="ep" @count="commentCount = $event" />
        </ClientOnly>
      </div>

      <aside class="side">
        <ClientOnly>
          <NuxtLink v-if="nextEp" :to="`/watch/${movie.id}/${nextEp}`" class="up-next">
            <img loading="lazy" decoding="async" :src="movie.poster" alt="">
            <span class="un-text">
              <small>{{ nextLocked ? 'វគ្គបន្ទាប់ · VIP' : 'វគ្គបន្ទាប់' }}</small>
              <strong>វគ្គ {{ kh(nextEp) }}</strong>
              <span>{{ movie.title }}</span>
            </span>
            <AppIcon :name="nextLocked ? 'lock' : 'play'" :size="18" class="un-icon" />
          </NuxtLink>
          <NuxtLink v-else-if="nextSeries" :to="`/detail/${nextSeries.id}`" class="up-next">
            <img loading="lazy" decoding="async" :src="nextSeries.poster" alt="">
            <span class="un-text">
              <small>ចប់រឿងហើយ · រឿងបន្ទាប់</small>
              <strong>{{ nextSeries.title }}</strong>
              <span>{{ kh(nextSeries.episodes) }} វគ្គ</span>
            </span>
            <AppIcon name="chevron-right" :size="18" class="un-icon" />
          </NuxtLink>
        </ClientOnly>

        <h2>វគ្គទាំងអស់</h2>
        <ClientOnly>
          <EpisodeGrid :movie="movie" :current="ep" compact />
        </ClientOnly>
      </aside>
    </div>

    <MovieRow v-if="similar.length" title="រឿងស្រដៀងគ្នា" :items="similar" small />
  </div>
</template>

<style scoped>
.page {
  background: radial-gradient(ellipse 60% 420px at 30% 0%, rgb(var(--ambient) / calc(var(--ambient-alpha) * 0.8)), transparent 70%);
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 28px;
  align-items: start;
  margin-bottom: 32px;
}

.load-error {
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 12px;
  background: #111;
  color: #fff;
  opacity: 1;
}

.load-error p {
  margin: 0;
}

.player-skeleton {
  aspect-ratio: 16 / 9;
  border-radius: 16px;
  background: #111 center / cover no-repeat;
  opacity: 0.6;
}

.bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin: 18px 0 8px;
}

h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 22px;
}

h1 a:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
}

.ep {
  margin: 2px 0 0;
  color: var(--text-muted);
}

.tools {
  display: flex;
  gap: 4px;
}

.shortcuts {
  color: var(--text-muted);
  font-size: 14px;
}

.shortcuts summary {
  min-height: 36px;
  cursor: pointer;
}

.shortcuts dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 4px 16px;
  margin: 8px 0 0;
}

.shortcuts dt {
  color: var(--text-strong);
  font-family: ui-monospace, monospace;
  font-size: 13px;
}

.shortcuts dd {
  margin: 0;
}

.up-next {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding: 10px;
  border-radius: 14px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
}

.up-next:hover {
  background: var(--bg-hover);
}

.up-next img {
  width: 64px;
  aspect-ratio: 5 / 7;
  object-fit: cover;
  border-radius: 8px;
}

.un-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.un-text small {
  color: var(--text-muted);
  font-size: 13px;
}

.un-text strong {
  color: var(--text-strong);
}

.un-text span {
  overflow: hidden;
  color: var(--text-muted);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.un-icon {
  flex-shrink: 0;
  color: var(--text-muted);
}

.side h2 {
  margin: 0 0 12px;
  color: var(--text-strong);
  font-size: 18px;
}

@media (max-width: 1100px) {
  .layout {
    grid-template-columns: 1fr;
  }
}

@media (hover: none) {
  .shortcuts {
    display: none;
  }
}

</style>
