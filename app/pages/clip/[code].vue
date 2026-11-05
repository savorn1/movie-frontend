<script setup lang="ts">
/*
 * A shared clip: plays the 15 seconds someone shared (link previews show its poster and video), then
 * offers the full episode from that moment. Still being cut: waits and checks again.
 */
interface Clip {
  code: string
  status: 'PENDING' | 'READY' | 'FAILED'
  url: string | null
  posterUrl: string | null
  seriesId: number
  seriesTitle: string
  seriesPoster: string | null
  episode: number
  startSeconds: number
  seconds: number
}

const route = useRoute()
const code = String(route.params.code)
const { data: clip, refresh, error } = await useFetch<Clip>(`/api/clips/${code}`)
if (error.value?.statusCode === 404) throw createError({ statusCode: 404, message: 'រកមិនឃើញឃ្លីបនេះទេ' })

const fullLink = computed(() => (clip.value ? `/watch/${clip.value.seriesId}/${clip.value.episode}?t=${clip.value.startSeconds}` : '/'))

usePageMeta(() => ({
  title: clip.value ? `${clip.value.seriesTitle} វគ្គ ${kh(clip.value.episode)} · ឃ្លីប` : 'ឃ្លីប',
  description: clip.value ? `មើលឃ្លីប ${kh(clip.value.seconds)} វិនាទីពី “${clip.value.seriesTitle}” ហើយបន្តមើលវគ្គពេញនៅ RuengFlix` : undefined,
  image: clip.value?.posterUrl ?? clip.value?.seriesPoster ?? undefined,
  type: 'video.episode'
}))
useSeoMeta({
  ogVideo: () => clip.value?.url ?? undefined,
  ogVideoType: 'video/mp4'
})

const sound = ref(false)
const player = ref<HTMLVideoElement>()
function toggleSound() {
  sound.value = !sound.value
  if (player.value) {
    player.value.muted = !sound.value
    player.value.play().catch(() => {})
  }
}

let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  $fetch(`/api/clips/${code}/view`, { method: 'POST' }).catch(() => {})
  if (clip.value?.status === 'PENDING') {
    timer = setInterval(async () => {
      await refresh()
      if (clip.value?.status !== 'PENDING') clearInterval(timer)
    }, 3000)
  }
})
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div v-if="clip" class="page">
    <div class="stage">
      <video
        v-if="clip.status === 'READY'"
        ref="player"
        :src="clip.url!"
        :poster="clip.posterUrl ?? undefined"
        autoplay
        muted
        loop
        playsinline
        class="video"
        @click="toggleSound"
      />
      <div v-else class="waiting">
        <p>{{ clip.status === 'FAILED' ? 'ឃ្លីបនេះមិនអាចបង្ហាញបានទេ' : 'កំពុងរៀបចំឃ្លីប…' }}</p>
      </div>
      <button v-if="clip.status === 'READY'" type="button" class="sound" :aria-label="sound ? 'បិទសំឡេង' : 'បើកសំឡេង'" @click="toggleSound">
        <AppIcon :name="sound ? 'volume' : 'volume-off'" :size="20" />
      </button>
    </div>

    <div class="about">
      <img v-if="clip.seriesPoster" :src="imgSrc(clip.seriesPoster, 96)" alt="" class="poster">
      <div>
        <h1>{{ clip.seriesTitle }}</h1>
        <p class="muted">វគ្គ {{ kh(clip.episode) }} · ឃ្លីប {{ kh(clip.seconds) }} វិនាទី</p>
      </div>
    </div>
    <NuxtLink :to="fullLink" class="btn btn-primary cta"><AppIcon name="play" :size="18" /> មើលវគ្គពេញ</NuxtLink>
    <NuxtLink :to="`/detail/${clip.seriesId}`" class="btn more">គ្រប់វគ្គ</NuxtLink>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  gap: 16px;
  max-width: 560px;
  margin: 0 auto;
  padding: 24px 16px 40px;
}

.stage {
  position: relative;
  overflow: hidden;
  border-radius: 16px;
  background: #000;
}

.video {
  display: block;
  width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.waiting {
  display: grid;
  place-items: center;
  aspect-ratio: 16 / 9;
  color: rgba(255, 255, 255, 0.8);
}

.sound {
  position: absolute;
  right: 10px;
  bottom: 10px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
}

.about {
  display: flex;
  align-items: center;
  gap: 12px;
}

.poster {
  width: 64px;
  aspect-ratio: 5 / 7;
  border-radius: 8px;
  object-fit: cover;
}

h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 20px;
}

.muted {
  margin: 0;
  color: var(--text-muted);
}

.cta {
  justify-content: center;
  min-height: 52px;
  font-size: 17px;
}

.more {
  justify-content: center;
}
</style>
