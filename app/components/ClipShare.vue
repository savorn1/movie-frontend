<script setup lang="ts">
/*
 * "Share a clip": the 15 seconds before this moment, cut on the server (VideoLingo), then shared as a
 * link to a page that plays it with a "watch the full episode" button. Waits for the cut (usually a
 * few seconds), showing the preview once it's ready.
 */
const props = defineProps<{ seriesId: number; ep: number; at: number; title: string }>()
const emit = defineEmits<{ close: [] }>()

interface Clip {
  code: string
  status: 'PENDING' | 'READY' | 'FAILED'
  url: string | null
  posterUrl: string | null
  startSeconds: number
  seconds: number
}

const clip = ref<Clip | null>(null)
const error = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
let tries = 0
const { share } = useShare()
const { success } = useToast()

const link = computed(() => (clip.value ? `${window.location.origin}/clip/${clip.value.code}` : ''))
const caption = computed(() => `🎬 ${props.title} វគ្គ ${kh(props.ep)} · មើលនៅ RuengFlix`)

async function create() {
  error.value = ''
  try {
    clip.value = await $fetch<Clip>('/api/clips', { method: 'POST', body: { seriesId: props.seriesId, episode: props.ep, at: Math.floor(props.at), seconds: 15 } })
    poll()
  } catch (err) {
    error.value = paymentError(err)
  }
}

async function poll() {
  clearTimeout(timer)
  if (!clip.value || clip.value.status !== 'PENDING') {
    if (clip.value?.status === 'FAILED') error.value = 'មិនអាចធ្វើឃ្លីបបានទេ។ សូមព្យាយាមនៅពេលផ្សេង។'
    return
  }
  if (++tries > 45) {
    error.value = 'ការរៀបចំឃ្លីបយូរជាងធម្មតា។ សូមព្យាយាមម្តងទៀតបន្តិចក្រោយ។'
    return
  }
  timer = setTimeout(async () => {
    clip.value = await $fetch<Clip>(`/api/clips/${clip.value!.code}`).catch(() => clip.value)
    poll()
  }, 2000)
}

async function copy() {
  try {
    await navigator.clipboard.writeText(link.value)
    success('បានចម្លងតំណ')
  } catch {
    window.prompt('ចម្លងតំណនេះ', link.value)
  }
}

const onKey = (e: KeyboardEvent) => e.key === 'Escape' && emit('close')
onMounted(() => {
  create()
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  clearTimeout(timer)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="clip-sheet" role="dialog" aria-modal="true" aria-labelledby="clip-title" @click.self="emit('close')" @click.stop>
    <div class="card">
      <button type="button" class="x" aria-label="បិទ" @click="emit('close')"><AppIcon name="close" :size="20" /></button>
      <h2 id="clip-title">ចែករំលែកឃ្លីប</h2>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <template v-else-if="clip?.status === 'READY'">
        <video :src="clip.url!" :poster="clip.posterUrl ?? undefined" class="preview" autoplay muted loop playsinline />
        <p class="muted">{{ kh(clip.seconds) }} វិនាទី · វគ្គ {{ kh(ep) }}</p>
        <div class="row">
          <a class="btn btn-primary" :href="`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(caption)}`" target="_blank" rel="noopener">
            <AppIcon name="send" :size="16" /> Telegram
          </a>
          <a class="btn" :href="`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(link)}`" target="_blank" rel="noopener">Facebook</a>
          <button type="button" class="btn" @click="share(caption, link)"><AppIcon name="share" :size="16" /> ផ្សេងៗ</button>
          <button type="button" class="btn" @click="copy">ចម្លងតំណ</button>
        </div>
      </template>
      <div v-else class="working" role="status">
        <span class="spin" aria-hidden="true" />
        <p>កំពុងកាត់ឃ្លីប ១៥ វិនាទីចុងក្រោយ…</p>
      </div>
    </div>
  </div>
</template>

<style scoped>
.clip-sheet {
  position: absolute;
  inset: 0;
  z-index: 9;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.72);
}

.card {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 12px;
  width: min(420px, 100%);
  padding: 20px 16px 16px;
  border-radius: 18px;
  background: rgba(22, 22, 26, 0.98);
  color: #fff;
  text-align: center;
  animation: pop-in var(--dur) var(--ease-out);
}

h2 {
  margin: 0;
  font-size: 18px;
}

.x {
  position: absolute;
  top: 6px;
  right: 6px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  color: #fff;
}

.preview {
  width: 100%;
  max-height: 40vh;
  border-radius: 12px;
  background: #000;
  object-fit: contain;
}

.muted {
  margin: 0;
  color: rgba(255, 255, 255, 0.7);
  font-size: 14px;
}

.row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
}

.row .btn:not(.btn-primary) {
  background: rgba(255, 255, 255, 0.14);
  color: #fff;
}

.working {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 12px 0;
}

.working p {
  margin: 0;
}

.spin {
  width: 36px;
  height: 36px;
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

.error {
  margin: 0;
  color: #ff8a8a;
}
</style>
