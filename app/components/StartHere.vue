<script setup lang="ts">
/*
 * The Me page for someone just starting: instead of empty sections, what to do first.
 *  - Guests: create an account (progress on every device, free coins)
 *  - New accounts (nothing watched yet): watch a first episode, collect today's free coins, follow a series
 * Disappears once all three steps are done.
 */
const { viewer, enabled } = useViewer()
const { wallet } = useWallet()
const { history, following } = useLibrary()
const { hotNow } = useCatalog()

const pick = computed(() => hotNow.value[0])
const steps = computed(() => [
  { done: history.value.length > 0, title: 'មើលវគ្គដំបូង', text: pick.value ? `សាក “${pick.value.title}” · ពេញនិយមបំផុតថ្ងៃនេះ` : 'ជ្រើសរឿងណាមួយ', to: pick.value ? `/watch/${pick.value.id}/1` : '/browse', cta: 'មើល' },
  { done: !!wallet.value?.checkIn.doneToday, title: 'ទទួលកាក់ឥតគិតថ្លៃ', text: 'ចុះឈ្មោះរាល់ថ្ងៃ ដើម្បីដោះសោវគ្គ VIP', to: '/library#wallet', cta: 'ទទួល' },
  { done: following.value.length > 0, title: 'តាមដានរឿងមួយ', text: 'ទទួលដំណឹងពេលមានវគ្គថ្មី', to: '/schedule', cta: 'មើលកាលវិភាគ' }
])
const left = computed(() => steps.value.filter(s => !s.done).length)
</script>

<template>
  <section v-if="enabled && !viewer" class="start guest">
    <div>
      <h2>បង្កើតគណនីឥតគិតថ្លៃ</h2>
      <p>មើលបន្តលើគ្រប់ឧបករណ៍ · ទទួលកាក់រាល់ថ្ងៃ · ដោះសោវគ្គ VIP</p>
    </div>
    <div class="acts">
      <NuxtLink :to="{ path: '/register', query: { next: '/library' } }" class="btn btn-primary">បង្កើតគណនី</NuxtLink>
      <NuxtLink :to="{ path: '/login', query: { next: '/library' } }" class="btn btn-outline">ចូលគណនី</NuxtLink>
    </div>
  </section>
  <section v-else-if="viewer && left > 0 && history.length < 3" class="start">
    <h2>ចាប់ផ្តើមនៅទីនេះ <small>{{ kh(3 - left) }}/៣</small></h2>
    <ol class="cascade">
      <li v-for="(s, i) in steps" :key="i" :class="{ done: s.done }">
        <span class="n"><AppIcon v-if="s.done" name="check" :size="14" /><template v-else>{{ kh(i + 1) }}</template></span>
        <div>
          <strong>{{ s.title }}</strong>
          <p>{{ s.text }}</p>
        </div>
        <NuxtLink v-if="!s.done" :to="s.to" class="go">{{ s.cta }}</NuxtLink>
      </li>
    </ol>
  </section>
</template>

<style scoped>
.start {
  display: grid;
  gap: 12px;
  margin-bottom: 28px;
  padding: 16px;
  border: 1px solid var(--accent);
  border-radius: 14px;
  background: var(--bg-elev);
}

.guest {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
}

h2 {
  margin: 0;
  font-size: 17px;
  color: var(--text-strong);
}

h2 small {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
}

p {
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.acts {
  display: flex;
  gap: 8px;
}

ol {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

li {
  display: flex;
  align-items: center;
  gap: 12px;
}

li > div {
  flex: 1;
  min-width: 0;
}

li strong {
  color: var(--text-strong);
  font-size: 14px;
}

.done strong {
  color: var(--text-muted);
  text-decoration: line-through;
}

.n {
  display: grid;
  flex: none;
  place-items: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-ink);
  font-size: 13px;
  font-weight: 700;
}

.done .n {
  background: #2fbf71;
  color: #fff;
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
