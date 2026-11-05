<script setup lang="ts">
/*
 * Today's missions (finish 3 episodes, write a comment), with progress and a Collect button once done.
 * Signed-in viewers only; shown on the home page and the Me page.
 */
interface Mission {
  key: 'WATCH_3' | 'COMMENT_1'
  goal: number
  progress: number
  coins: number
  claimed: boolean
}

defineProps<{ compact?: boolean }>()

const { viewer } = useViewer()
const { wallet } = useWallet()
const { success, fail } = useToast()
const missions = useState<Mission[] | null>('missions', () => null)
const busy = ref<string | null>(null)

const LABELS: Record<Mission['key'], { title: string; icon: string; to: string }> = {
  WATCH_3: { title: 'មើល ៣ វគ្គថ្ងៃនេះ', icon: 'play', to: '/browse' },
  COMMENT_1: { title: 'បញ្ចេញមតិម្តង', icon: 'comment', to: '/library' }
}

async function load() {
  if (!viewer.value) return
  try {
    missions.value = await $fetch<Mission[]>('/api/missions')
  } catch {
    // Missions are extra
  }
}
onMounted(load)
watch(() => viewer.value?.id, load)

async function claim(m: Mission) {
  busy.value = m.key
  try {
    const r = await $fetch<{ coins: number; missions: Mission[]; wallet: NonNullable<typeof wallet.value> }>(`/api/missions/${m.key}/claim`, { method: 'POST' })
    missions.value = r.missions
    wallet.value = r.wallet
    success(`បេសកកម្មរួចរាល់ · +${kh(r.coins)} កាក់`)
  } catch (err) {
    fail(paymentError(err))
  } finally {
    busy.value = null
  }
}

const allDone = computed(() => !!missions.value?.length && missions.value.every(m => m.claimed))
</script>

<template>
  <section v-if="viewer && missions?.length" class="missions" :class="{ compact }" aria-labelledby="missions-title">
    <h2 id="missions-title"><AppIcon name="sparkle" :size="18" /> បេសកកម្មថ្ងៃនេះ</h2>
    <p v-if="allDone" class="done">បានបញ្ចប់ទាំងអស់ហើយ · ត្រឡប់មកវិញថ្ងៃស្អែក!</p>
    <ul>
      <li v-for="m in missions" :key="m.key" :class="{ claimed: m.claimed }">
        <span class="ic"><AppIcon :name="m.claimed ? 'check' : LABELS[m.key].icon" :size="16" /></span>
        <div class="body">
          <strong>{{ LABELS[m.key].title }}</strong>
          <span class="bar" role="progressbar" :aria-valuenow="m.progress" aria-valuemin="0" :aria-valuemax="m.goal" :aria-label="LABELS[m.key].title">
            <span :style="{ width: `${(m.progress / m.goal) * 100}%` }" />
          </span>
          <small>{{ kh(m.progress) }}/{{ kh(m.goal) }} · +{{ kh(m.coins) }} កាក់</small>
        </div>
        <button v-if="!m.claimed && m.progress >= m.goal" type="button" class="btn btn-primary" :disabled="busy === m.key" @click="claim(m)">
          ទទួល +{{ kh(m.coins) }}
        </button>
        <span v-else-if="m.claimed" class="got">បានទទួល</span>
        <NuxtLink v-else :to="LABELS[m.key].to" class="go">ធ្វើ</NuxtLink>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.missions {
  display: grid;
  gap: 10px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-elev);
}

h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-size: 16px;
  color: var(--text-strong);
}

h2 svg {
  color: var(--accent-text);
}

.done {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
}

ul {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.compact ul {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

li {
  display: flex;
  align-items: center;
  gap: 12px;
}

.ic {
  display: grid;
  flex: none;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--bg-hover);
  color: var(--text-strong);
}

.claimed .ic {
  background: #2fbf71;
  color: #fff;
}

.body {
  display: grid;
  flex: 1;
  gap: 4px;
  min-width: 0;
}

.body strong {
  font-size: 14px;
  color: var(--text-strong);
}

.bar {
  height: 6px;
  border-radius: 3px;
  background: var(--border);
  overflow: hidden;
}

.bar span {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 0.3s;
}

small,
.got {
  color: var(--text-muted);
  font-size: 12px;
}

.btn {
  flex: none;
  min-height: 36px;
  padding: 0 14px;
}

.go {
  flex: none;
  min-height: 36px;
  display: grid;
  place-items: center;
  padding: 0 14px;
  border: 1px solid var(--border);
  border-radius: 999px;
  color: var(--text-strong);
  font-size: 14px;
}
</style>
