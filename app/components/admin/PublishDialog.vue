<script setup lang="ts">
import type { Movie } from '#shared/data/movies'

// Publish the next episode of a series, optionally alerting its Telegram followers
const props = defineProps<{ series: Movie }>()
const emit = defineEmits<{ close: []; published: [message: string] }>()

const dialog = ref<HTMLDialogElement>()
onMounted(() => dialog.value?.showModal())

const next = props.series.episodes + 1
const videoUrl = ref('')
const notify = ref(true)
const error = ref('')
const sending = ref(false)

interface PublishResult {
  episode: number
  notified: { sent: number; followers: number } | { skipped: string } | null
}

async function publish() {
  error.value = ''
  sending.value = true
  try {
    const r = await $fetch<PublishResult>(`/api/admin/series/${props.series.id}/publish`, {
      method: 'POST',
      body: { videoUrl: videoUrl.value || undefined, notify: notify.value }
    })
    const n = r.notified
    const tail = !n ? '' : 'skipped' in n ? ' · Telegram not configured' : ` · alerted ${n.sent}/${n.followers} followers`
    emit('published', `បានចេញវគ្គ ${r.episode} នៃ “${props.series.title}”${tail}`)
  } catch (err) {
    error.value = (err as { data?: { message?: string } }).data?.message ?? 'មិនអាចចេញវគ្គបានទេ'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <dialog ref="dialog" class="dialog" aria-labelledby="publish-title" @close="emit('close')">
    <form class="form" @submit.prevent="publish">
      <h2 id="publish-title">ចេញវគ្គ {{ next }} · {{ series.title }}</h2>
      <label class="field">
        <span>តំណវីដេអូ <small>(.m3u8 or .mp4; leave empty to use the sample clip)</small></span>
        <input v-model="videoUrl" type="url" placeholder="https://…/episode.m3u8">
      </label>
      <label class="check">
        <input v-model="notify" type="checkbox">
        <span>ផ្ញើដំណឹងទៅអ្នកតាមដានតាម Telegram</span>
      </label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="buttons">
        <button type="button" class="btn btn-outline" @click="dialog?.close()">បោះបង់</button>
        <button type="submit" class="btn btn-primary" :disabled="sending">ចេញវគ្គ {{ next }}</button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.dialog {
  width: min(480px, calc(100% - 24px));
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--bg-elev);
  color: var(--text);
}

.dialog::backdrop {
  background: rgba(0, 0, 0, 0.6);
}

.form {
  display: grid;
  gap: 14px;
  padding: 24px;
}

h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 19px;
}

.field {
  display: grid;
  gap: 6px;
  font-size: 14px;
}

.field small {
  color: var(--text-muted);
}

.field input {
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 40px;
  font-size: 14px;
}

.check input {
  width: 20px;
  height: 20px;
}

.error {
  margin: 0;
  color: #ff6b6b;
}

.buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
