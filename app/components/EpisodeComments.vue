<script setup lang="ts">
// Comments under an episode. Everyone can read; signed-in viewers write, delete their own, and report
// others (enough reports hide a comment until an admin looks at it).
interface CommentItem {
  id: number
  body: string
  createdAt: string
  author: { displayName: string; photoUrl: string | null }
  mine: boolean
}

const props = defineProps<{ seriesId: number; ep: number }>()

const { viewer, enabled: accountsOn } = useViewer()
const { show } = useToast()
const route = useRoute()

const items = ref<CommentItem[]>([])
const total = ref(0)
const draft = ref('')
const busy = ref(false)
const error = ref('')
const reported = ref(new Set<number>())
const MAX = 500

async function load() {
  try {
    const r = await $fetch<{ total: number; items: CommentItem[] }>('/api/comments', { query: { series: props.seriesId, ep: props.ep } })
    items.value = r.items
    total.value = r.total
  } catch {
    // Comments are extra: the episode still plays
  }
}
watch(() => [props.seriesId, props.ep, viewer.value?.id], load, { immediate: true })

async function post() {
  const body = draft.value.trim()
  if (!body) return
  error.value = ''
  busy.value = true
  try {
    const c = await $fetch<CommentItem>('/api/comments', { method: 'POST', body: { seriesId: props.seriesId, episode: props.ep, body } })
    items.value = [c, ...items.value]
    total.value++
    draft.value = ''
  } catch (err) {
    error.value = paymentError(err)
  } finally {
    busy.value = false
  }
}

async function remove(c: CommentItem) {
  try {
    await $fetch(`/api/comments/${c.id}`, { method: 'DELETE' })
    items.value = items.value.filter(x => x.id !== c.id)
    total.value--
  } catch (err) {
    show(paymentError(err))
  }
}

async function report(c: CommentItem) {
  try {
    await $fetch(`/api/comments/${c.id}/report`, { method: 'POST' })
    reported.value = new Set([...reported.value, c.id])
    show('អរគុណ · យើងនឹងពិនិត្យមតិនេះ')
  } catch (err) {
    show(paymentError(err))
  }
}

const ago = (iso: string) => {
  const s = Math.max(0, (Date.now() - Date.parse(iso)) / 1000)
  if (s < 60) return 'ឥឡូវនេះ'
  if (s < 3600) return `${kh(Math.floor(s / 60))} នាទីមុន`
  if (s < 86400) return `${kh(Math.floor(s / 3600))} ម៉ោងមុន`
  return `${kh(Math.floor(s / 86400))} ថ្ងៃមុន`
}
</script>

<template>
  <section class="comments" aria-labelledby="comments-title">
    <h2 id="comments-title"><AppIcon name="comment" :size="20" /> មតិ <span class="count">{{ kh(total) }}</span></h2>

    <form v-if="viewer" class="write" @submit.prevent="post">
      <textarea
        v-model="draft"
        :maxlength="MAX"
        rows="2"
        placeholder="សរសេរមតិអំពីវគ្គនេះ…"
        aria-label="មតិរបស់អ្នក"
        @keydown.enter.exact.prevent="post"
      />
      <div class="row">
        <small>{{ kh(draft.length) }}/{{ kh(MAX) }}</small>
        <button type="submit" class="btn btn-primary" :disabled="busy || !draft.trim()">បញ្ចេញមតិ</button>
      </div>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
    </form>
    <p v-else-if="accountsOn" class="signin">
      <NuxtLink :to="{ path: '/login', query: { next: route.fullPath } }">ចូលគណនី</NuxtLink> ដើម្បីបញ្ចេញមតិ
    </p>

    <ul v-if="items.length" class="list">
      <li v-for="c in items" :key="c.id">
        <img v-if="c.author.photoUrl" :src="c.author.photoUrl" alt="" class="avatar" width="32" height="32" referrerpolicy="no-referrer">
        <span v-else class="avatar initial" aria-hidden="true">{{ c.author.displayName.slice(0, 1) }}</span>
        <div class="body">
          <p class="meta"><strong>{{ c.author.displayName }}</strong> · {{ ago(c.createdAt) }}</p>
          <p class="text">{{ c.body }}</p>
          <div class="acts">
            <button v-if="c.mine" type="button" @click="remove(c)">លុប</button>
            <button v-else-if="viewer && !reported.has(c.id)" type="button" @click="report(c)">រាយការណ៍</button>
          </div>
        </div>
      </li>
    </ul>
    <p v-else class="empty">មិនទាន់មានមតិនៅឡើយ{{ viewer ? ' · ក្លាយជាអ្នកដំបូង!' : '' }}</p>
  </section>
</template>

<style scoped>
.comments {
  display: grid;
  gap: 12px;
  margin-top: 24px;
}

h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 18px;
}

.count {
  color: var(--text-muted);
  font-weight: 500;
}

.write {
  display: grid;
  gap: 6px;
}

textarea {
  width: 100%;
  min-height: 64px;
  padding: 10px 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elev);
  color: var(--text);
  font: inherit;
  font-size: 16px;
  resize: vertical;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.row small,
.empty,
.signin {
  color: var(--text-muted);
}

.signin a {
  color: var(--accent);
  font-weight: 600;
}

.list {
  display: grid;
  gap: 14px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.list li {
  display: flex;
  gap: 10px;
}

.avatar {
  flex: none;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
}

.initial {
  display: grid;
  place-items: center;
  background: var(--bg-elev);
  color: var(--text-strong);
  font-weight: 600;
}

.body {
  min-width: 0;
}

.meta,
.text {
  margin: 0;
}

.meta {
  color: var(--text-muted);
  font-size: 13px;
}

.meta strong {
  color: var(--text-strong);
}

.text {
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.acts button {
  min-height: 32px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text-muted);
  font: inherit;
  font-size: 13px;
  cursor: pointer;
}

.error {
  margin: 0;
  color: #ff6b6b;
}
</style>
