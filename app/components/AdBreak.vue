<script setup lang="ts">
/*
 * A sponsor ad that unlocks one VIP episode. It starts from a tap (so it may play with sound), has no
 * controls or skipping, and counts only seconds actually played while the page is visible. Once the
 * ad's length has played, movie-api is asked to unlock: it checks the time on its own clock as well.
 */
const props = defineProps<{ seriesId: number; ep: number }>()
const emit = defineEmits<{ done: []; close: [] }>()

interface Started {
  viewId: number
  ad: { title: string; videoUrl: string; clickUrl: string | null; seconds: number }
  left: number
}

const started = ref<Started | null>(null)
const error = ref('')
const played = ref(0)
const finishing = ref(false)
const needsTap = ref(false)
const video = ref<HTMLVideoElement>()
let lastTime = 0

async function start() {
  error.value = ''
  try {
    started.value = await $fetch<Started>('/api/ads/start', { method: 'POST', body: { seriesId: props.seriesId, episode: props.ep } })
    await nextTick()
    play()
  } catch (err) {
    error.value = paymentError(err)
  }
}

function play() {
  const v = video.value
  if (!v) return
  v.play().then(() => (needsTap.value = false)).catch(() => {
    // Sound refused without a fresh tap: try muted, else ask for a tap
    v.muted = true
    v.play().then(() => (needsTap.value = false)).catch(() => (needsTap.value = true))
  })
}

// Only real playback counts: jumps (seeking is impossible without controls, but just in case) don't
function onTime() {
  const v = video.value
  if (!v) return
  const step = v.currentTime - lastTime
  if (step > 0 && step < 1.5 && !document.hidden) played.value += step
  lastTime = v.currentTime
  if (started.value && played.value >= started.value.ad.seconds && !finishing.value) complete()
}

// A short ad loops until its time is up
function onEnded() {
  lastTime = 0
  if (started.value && played.value < started.value.ad.seconds) video.value?.play().catch(() => {})
}

const left = computed(() => (started.value ? Math.max(0, Math.ceil(started.value.ad.seconds - played.value)) : 0))

async function complete() {
  if (!started.value) return
  finishing.value = true
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await $fetch(`/api/ads/${started.value.viewId}/complete`, { method: 'POST' })
      emit('done')
      return
    } catch (err) {
      const code = (err as { data?: { data?: { code?: string } } }).data?.data?.code
      // A second ahead of the server's clock: wait a moment and ask again
      if (code === 'AD_TOO_SOON' && attempt < 2) {
        await new Promise(r => setTimeout(r, 1500))
        continue
      }
      error.value = paymentError(err)
      finishing.value = false
      return
    }
  }
}

onMounted(start)
</script>

<template>
  <div class="ad" role="dialog" aria-modal="true" aria-label="ពាណិជ្ជកម្ម">
    <template v-if="started">
      <video
        ref="video"
        class="clip"
        :src="started.ad.videoUrl"
        playsinline
        webkit-playsinline
        disablepictureinpicture
        controlslist="nodownload noplaybackrate"
        @timeupdate="onTime"
        @ended="onEnded"
        @contextmenu.prevent
      />
      <div class="top">
        <span class="tag">ពាណិជ្ជកម្ម · {{ started.ad.title }}</span>
        <a v-if="started.ad.clickUrl" :href="started.ad.clickUrl" target="_blank" rel="noopener sponsored" class="more">ស្វែងយល់បន្ថែម</a>
      </div>
      <div class="count" role="status" aria-live="polite">
        <template v-if="finishing && !error">កំពុងដោះសោ…</template>
        <template v-else>វគ្គ {{ kh(ep) }} នឹងបើកក្នុង {{ kh(left) }} វិ</template>
      </div>
      <button v-if="needsTap" type="button" class="tap" @click="play"><AppIcon name="play" :size="36" /></button>
    </template>
    <p v-else-if="!error" class="loading">កំពុងរៀបចំពាណិជ្ជកម្ម…</p>

    <div v-if="error" class="err">
      <p role="alert">{{ error }}</p>
      <div class="row">
        <button type="button" class="btn btn-primary" @click="started ? complete() : start()">ព្យាយាមម្តងទៀត</button>
        <button type="button" class="btn" @click="emit('close')">បិទ</button>
      </div>
    </div>
    <button v-if="!finishing" type="button" class="close" aria-label="បោះបង់" @click="emit('close')">
      <AppIcon name="close" :size="20" />
    </button>
  </div>
</template>

<style scoped>
.ad {
  position: absolute;
  inset: 0;
  z-index: 8;
  display: grid;
  place-items: center;
  background: #000;
  color: #fff;
}

.clip {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.top {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  left: 12px;
  right: 56px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.tag {
  padding: 3px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.6);
  font-size: 13px;
}

.more {
  padding: 3px 12px;
  border-radius: 999px;
  background: #fff;
  color: #000;
  font-size: 13px;
  font-weight: 600;
}

.count {
  position: absolute;
  right: 12px;
  bottom: calc(16px + env(safe-area-inset-bottom));
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.7);
  font-size: 14px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
}

.tap {
  position: absolute;
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
}

.loading {
  color: rgba(255, 255, 255, 0.8);
}

.err {
  position: absolute;
  display: grid;
  justify-items: center;
  gap: 12px;
  max-width: 320px;
  padding: 20px;
  border-radius: 16px;
  background: rgba(20, 20, 24, 0.95);
  text-align: center;
}

.err p {
  margin: 0;
}

.row {
  display: flex;
  gap: 8px;
}

.close {
  position: absolute;
  top: calc(8px + env(safe-area-inset-top));
  right: 8px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  color: #fff;
}
</style>
