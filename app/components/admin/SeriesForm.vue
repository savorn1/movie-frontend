<script setup lang="ts">
import { categoryLabels, FREE_EPISODES, genrePool, type Category, type Movie } from '#shared/data/movies'

// Create (no `series`) or edit a series in a modal dialog
const props = defineProps<{ series: Movie | null }>()
const emit = defineEmits<{ close: []; saved: [message: string] }>()

const dialog = ref<HTMLDialogElement>()
onMounted(() => dialog.value?.showModal())

const s = props.series
const form = reactive({
  title: s?.title ?? '',
  description: s?.description ?? '',
  latin: s?.latin ?? '',
  category: (s?.category ?? 'romance') as Category,
  genres: (s?.genres ?? [...genrePool.romance]).join(', '),
  region: s?.region ?? 'ចិន',
  year: s?.year ?? new Date().getFullYear(),
  status: s?.status ?? 'ongoing',
  vip: s?.vip ?? false,
  freeEpisodes: s?.freeEpisodes ?? FREE_EPISODES,
  recapSeconds: s?.recapSeconds ?? 0,
  videoUrl: ''
})

const problems = ref<string[]>([])
const saving = ref(false)

async function save() {
  problems.value = []
  saving.value = true
  const { videoUrl, ...fields } = form
  try {
    if (s) {
      await $fetch(`/api/admin/series/${s.id}`, { method: 'PUT', body: fields })
      emit('saved', `បានរក្សាទុក “${form.title}”`)
    } else {
      await $fetch('/api/admin/series', { method: 'POST', body: { ...fields, videoUrl: videoUrl || undefined } })
      emit('saved', `បានបន្ថែម “${form.title}”`)
    }
  } catch (err) {
    const e = err as { data?: { data?: { problems?: string[] }; message?: string } }
    problems.value = e.data?.data?.problems ?? [e.data?.message ?? 'មិនអាចរក្សាទុកបានទេ']
  } finally {
    saving.value = false
  }
}

// Deleting can't be undone, so it asks first
async function remove() {
  if (!s || !window.confirm(`លុប “${s.title}” ជាអចិន្ត្រៃយ៍? មិនអាចត្រឡប់វិញបានទេ។`)) return
  await $fetch(`/api/admin/series/${s.id}`, { method: 'DELETE' })
  emit('saved', `បានលុប “${s.title}”`)
}
</script>

<template>
  <dialog ref="dialog" class="dialog" aria-labelledby="series-form-title" @close="emit('close')">
    <form method="dialog" class="form" @submit.prevent="save">
      <h2 id="series-form-title">{{ s ? `កែ “${s.title}”` : 'បន្ថែមរឿងថ្មី' }}</h2>

      <ul v-if="problems.length" class="problems" role="alert">
        <li v-for="p in problems" :key="p">{{ p }}</li>
      </ul>

      <label class="field wide">
        <span>ចំណងជើង</span>
        <input v-model="form.title" required maxlength="120">
      </label>
      <label class="field wide">
        <span>សេចក្តីពិពណ៌នា</span>
        <textarea v-model="form.description" rows="3" maxlength="1000" />
      </label>
      <label class="field wide">
        <span>ពាក្យស្វែងរកឡាតាំង <small>(English / romanised, for Latin-keyboard search)</small></span>
        <input v-model="form.latin" maxlength="200" placeholder="summer love sneha">
      </label>
      <label class="field">
        <span>ប្រភេទ</span>
        <select v-model="form.category">
          <option v-for="(label, key) in categoryLabels" :key="key" :value="key">{{ label }}</option>
        </select>
      </label>
      <label class="field">
        <span>ស្ថានភាព</span>
        <select v-model="form.status">
          <option value="ongoing">កំពុងចាក់</option>
          <option value="completed">ចប់ហើយ</option>
        </select>
      </label>
      <label class="field wide">
        <span>ប្រភេទរង <small>(comma separated, up to 5)</small></span>
        <input v-model="form.genres">
      </label>
      <label class="field">
        <span>ប្រទេស</span>
        <input v-model="form.region" maxlength="40">
      </label>
      <label class="field">
        <span>ឆ្នាំ</span>
        <input v-model.number="form.year" type="number" min="1990" max="2100">
      </label>
      <label class="field check">
        <input v-model="form.vip" type="checkbox">
        <span>VIP</span>
      </label>
      <label class="field">
        <span>វគ្គឥតគិតថ្លៃ <small>(VIP only)</small></span>
        <input v-model.number="form.freeEpisodes" type="number" min="0" max="100" :disabled="!form.vip">
      </label>
      <label class="field">
        <span>រយៈពេលសង្ខេប (វិនាទី) <small>for “Skip recap”</small></span>
        <input v-model.number="form.recapSeconds" type="number" min="0" max="300">
      </label>
      <label v-if="!s" class="field wide">
        <span>វីដេអូវគ្គ ១ <small>(.m3u8 or .mp4 link; optional)</small></span>
        <input v-model="form.videoUrl" type="url" placeholder="https://…/ep1.m3u8">
      </label>

      <div class="buttons wide">
        <button v-if="s" type="button" class="btn danger" @click="remove">លុប</button>
        <span class="spacer" />
        <button type="button" class="btn btn-outline" @click="dialog?.close()">បោះបង់</button>
        <button type="submit" class="btn btn-primary" :disabled="saving">{{ s ? 'រក្សាទុក' : 'បន្ថែម' }}</button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.dialog {
  width: min(640px, calc(100% - 24px));
  max-height: calc(100dvh - 24px);
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
  grid-template-columns: 1fr 1fr;
  gap: 14px;
  padding: 24px;
}

h2 {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--text-strong);
  font-size: 20px;
}

.problems {
  grid-column: 1 / -1;
  margin: 0;
  padding: 10px 14px 10px 30px;
  border-radius: 10px;
  background: rgba(215, 0, 21, 0.12);
  color: var(--text-strong);
  font-size: 14px;
}

.field {
  display: grid;
  gap: 6px;
  font-size: 14px;
}

.field small {
  color: var(--text-muted);
}

.wide {
  grid-column: 1 / -1;
}

.field input:not([type='checkbox']),
.field select,
.field textarea {
  min-height: 40px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
}

.field input:disabled {
  opacity: 0.5;
}

.check {
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: end;
  min-height: 40px;
}

.check input {
  width: 20px;
  height: 20px;
}

.buttons {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.spacer {
  flex: 1;
}

.danger {
  border: 1px solid #d70015;
  color: #ff6b6b;
}

:root[data-theme='light'] .danger {
  color: #c40014;
}

@media (max-width: 560px) {
  .form {
    grid-template-columns: 1fr;
  }
}
</style>
