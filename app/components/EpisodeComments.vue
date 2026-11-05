<script setup lang="ts">
// Comments under an episode. Everyone can read; signed-in viewers write, delete their own, and report
// others (enough reports hide a comment until an admin looks at it).
interface CommentItem {
  id: number
  body: string
  createdAt: string
  author: { displayName: string; photoUrl: string | null }
  mine: boolean
  likes: number
  liked: boolean
  pinned: boolean
  /** Written by RuengFlix (admin portal) */
  official?: boolean
  replies?: CommentItem[]
}

const props = defineProps<{ seriesId: number; ep: number }>()
const emit = defineEmits<{ count: [number] }>()

const { viewer, enabled: accountsOn } = useViewer()
const { show, success, fail } = useToast()
const route = useRoute()

const items = ref<CommentItem[]>([])
const total = ref(0)
const draft = ref('')
const busy = ref(false)
const error = ref('')
const reported = ref(new Set<number>())
const MAX = 500
const liking = ref(new Set<number>())
/** The comment whose heart just got liked: pops and bursts */
const burst = ref<number | null>(null)
watch(total, n => emit('count', n), { immediate: true })

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
    // Below the pinned one, above the rest
    const pins = items.value.filter(x => x.pinned)
    items.value = [...pins, c, ...items.value.filter(x => !x.pinned)]
    total.value++
    draft.value = ''
    haptic('success')
  } catch (err) {
    error.value = paymentError(err)
    haptic('error')
  } finally {
    busy.value = false
  }
}

async function remove(c: CommentItem) {
  try {
    await $fetch(`/api/comments/${c.id}`, { method: 'DELETE' })
    items.value = items.value.filter(x => x.id !== c.id)
    total.value--
    show('បានលុបមតិ')
  } catch (err) {
    fail(paymentError(err))
  }
}

// Optimistic: the heart changes at once and goes back if the server says no
async function toggleLike(c: CommentItem) {
  if (!viewer.value) {
    show('ចូលគណនីដើម្បីចូលចិត្តមតិ')
    return
  }
  if (liking.value.has(c.id)) return
  liking.value = new Set([...liking.value, c.id])
  const like = !c.liked
  c.liked = like
  c.likes += like ? 1 : -1
  haptic('tap')
  if (like) {
    burst.value = null
    nextTick(() => (burst.value = c.id))
    setTimeout(() => burst.value === c.id && (burst.value = null), 700)
  }
  try {
    const r = await $fetch<{ likes: number; liked: boolean }>(`/api/comments/${c.id}/like`, { method: 'PUT', body: { like } })
    c.likes = r.likes
    c.liked = r.liked
  } catch (err) {
    c.liked = !like
    c.likes += like ? -1 : 1
    fail(paymentError(err))
  } finally {
    const next = new Set(liking.value)
    next.delete(c.id)
    liking.value = next
  }
}

async function report(c: CommentItem) {
  try {
    await $fetch(`/api/comments/${c.id}/report`, { method: 'POST' })
    reported.value = new Set([...reported.value, c.id])
    success('អរគុណ · យើងនឹងពិនិត្យមតិនេះ')
  } catch (err) {
    fail(paymentError(err))
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
  <section id="comments" class="comments" aria-labelledby="comments-title">
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

    <ul v-if="items.length" class="list cascade">
      <li v-for="c in items" :key="c.id" :class="{ pinned: c.pinned }">
        <img loading="lazy" decoding="async" v-if="c.author.photoUrl" :src="c.author.photoUrl" alt="" class="avatar" width="32" height="32" referrerpolicy="no-referrer">
        <span v-else class="avatar initial" aria-hidden="true">{{ c.author.displayName.slice(0, 1) }}</span>
        <div class="body">
          <p v-if="c.pinned" class="pin"><AppIcon name="pin" :size="12" /> ខ្ទាស់ដោយ RuengFlix</p>
          <p class="meta"><strong>{{ c.author.displayName }}</strong> · {{ ago(c.createdAt) }}</p>
          <p class="text">{{ c.body }}</p>
          <ul v-if="c.replies?.length" class="replies">
            <li v-for="r in c.replies" :key="r.id">
              <span class="avatar official-mark" aria-hidden="true">R</span>
              <div>
                <p class="meta"><strong>RuengFlix</strong> <span class="badge"><AppIcon name="check" :size="11" /> ផ្លូវការ</span> · {{ ago(r.createdAt) }}</p>
                <p class="text">{{ r.body }}</p>
              </div>
            </li>
          </ul>
          <div class="acts">
            <button
              type="button"
              class="like"
              :class="{ on: c.liked }"
              :aria-pressed="c.liked"
              :aria-label="`ចូលចិត្ត · ${kh(c.likes)}`"
              @click="toggleLike(c)"
            >
              <span class="heart" :class="{ popping: burst === c.id }">
                <AppIcon name="heart" :size="15" :solid="c.liked" />
                <i v-if="burst === c.id" class="sparks" aria-hidden="true"><b v-for="n in 6" :key="n" :style="{ '--n': n }" /></i>
              </span>
              <span v-if="c.likes">{{ kh(c.likes) }}</span>
            </button>
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

.acts {
  display: flex;
  align-items: center;
  gap: 14px;
}

.like {
  display: inline-flex !important;
  align-items: center;
  gap: 4px;
}

.heart {
  position: relative;
  display: inline-grid;
}

.heart.popping {
  animation: pop-in 420ms var(--ease-spring);
}

/* Six little hearts flying out of a new like */
.sparks b {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 5px;
  height: 5px;
  margin: -2.5px;
  border-radius: 50%;
  background: #e5484d;
  animation: spark 600ms var(--ease-out) forwards;
  --a: calc(var(--n) * 60deg);
}

@keyframes spark {
  from {
    transform: rotate(var(--a)) translateY(0) scale(1);
    opacity: 1;
  }
  to {
    transform: rotate(var(--a)) translateY(-14px) scale(0.3);
    opacity: 0;
  }
}

.like.on {
  color: #e5484d !important;
}

.pinned {
  margin: 0 -10px;
  padding: 10px;
  border-radius: 12px;
  background: var(--bg-elev);
}

.pin {
  display: flex;
  align-items: center;
  gap: 4px;
  margin: 0 0 2px;
  color: var(--accent-text);
  font-size: 13px;
  font-weight: 600;
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

.replies {
  display: grid;
  gap: 8px;
  margin: 8px 0 4px;
  padding: 8px 0 0 12px;
  border-left: 2px solid var(--accent);
  list-style: none;
}

.replies li {
  display: flex;
  gap: 8px;
}

.official-mark {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  background: var(--accent);
  color: var(--accent-ink);
  font-size: 13px;
  font-weight: 800;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 0 6px;
  border-radius: 999px;
  background: var(--accent);
  color: var(--accent-ink);
  font-size: 13px;
  font-weight: 700;
}
</style>
