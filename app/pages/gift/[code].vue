<script setup lang="ts">
/*
 * A gift link from a friend: what's inside and a button to take it (signing in first if needed).
 * The sender sees "send this to a friend" instead; a redeemed gift says so.
 */
interface Gift {
  code: string
  kind: 'COINS' | 'VIP'
  coins: number | null
  months: number | null
  message: string | null
  from: string | null
  redeemed: boolean
  mine: boolean
}

const route = useRoute()
const code = String(route.params.code)
const { data: gift, error, refresh } = await useFetch<Gift>(`/api/gifts/${code}`)
const { viewer, enabled } = useViewer()
const { refresh: refreshWallet } = useWallet()
const { success, fail } = useToast()
const busy = ref(false)
const done = ref(false)

const what = computed(() => (gift.value?.kind === 'VIP' ? `VIP ${kh(gift.value.months ?? 0)} ខែ` : `កាក់ ${kh(gift.value?.coins ?? 0)}`))
usePageMeta(() => ({
  title: '🎁 កាដូសម្រាប់អ្នក',
  description: gift.value ? `${gift.value.from ?? 'មិត្តរបស់អ្នក'} ផ្ញើ ${what.value} ជូនអ្នកនៅ RuengFlix` : undefined,
  noindex: true
}))

async function take() {
  busy.value = true
  try {
    await $fetch('/api/gifts/redeem', { method: 'POST', body: { code } })
    done.value = true
    await refreshWallet()
    haptic('success')
    success(`បានទទួល ${what.value}`)
    await refresh()
  } catch (err) {
    fail(paymentError(err))
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="page">
    <div v-if="error || !gift" class="card">
      <span class="icon" aria-hidden="true">🎁</span>
      <h1>រកមិនឃើញកាដូនេះទេ</h1>
      <p class="muted">តំណអាចខុស ឬកាដូត្រូវបានលុបចោល។</p>
      <NuxtLink to="/" class="btn btn-primary">ទៅទំព័រដើម</NuxtLink>
    </div>
    <div v-else class="card">
      <span class="icon pop" aria-hidden="true">🎁</span>
      <p class="from">{{ gift.from ?? 'មិត្តរបស់អ្នក' }} ផ្ញើជូនអ្នក</p>
      <h1>{{ what }}</h1>
      <blockquote v-if="gift.message">“{{ gift.message }}”</blockquote>

      <ClientOnly>
        <template v-if="done">
          <p class="ok">បានបញ្ចូលក្នុងគណនីរបស់អ្នកហើយ!</p>
          <NuxtLink to="/" class="btn btn-primary">ចាប់ផ្តើមមើល</NuxtLink>
        </template>
        <p v-else-if="gift.redeemed" class="muted">កាដូនេះត្រូវបានគេទទួលរួចហើយ។</p>
        <p v-else-if="gift.mine" class="muted">នេះជាកាដូដែលអ្នកបានទិញ — ផ្ញើតំណនេះទៅមិត្តរបស់អ្នក។</p>
        <button v-else-if="viewer" type="button" class="btn btn-primary take" :disabled="busy" @click="take">ទទួលកាដូ</button>
        <NuxtLink v-else-if="enabled" :to="{ path: '/login', query: { next: route.fullPath } }" class="btn btn-primary take">ចូលគណនី ដើម្បីទទួល</NuxtLink>
      </ClientOnly>
    </div>
  </div>
</template>

<style scoped>
.page {
  display: grid;
  place-items: center;
  min-height: 70vh;
  padding: 24px 16px;
}

.card {
  display: grid;
  justify-items: center;
  gap: 10px;
  width: min(420px, 100%);
  padding: 32px 20px;
  border: 1px solid var(--border);
  border-radius: 20px;
  background: var(--bg-elev);
  text-align: center;
}

.icon {
  font-size: 56px;
  line-height: 1;
}

.icon.pop {
  animation: pop-in var(--dur-slow) var(--ease-spring);
}

.from {
  margin: 0;
  color: var(--text-muted);
}

h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 28px;
}

blockquote {
  margin: 0;
  color: var(--text);
  font-style: italic;
}

.muted {
  margin: 0;
  color: var(--text-muted);
}

.ok {
  margin: 0;
  color: #2fbf71;
  font-weight: 600;
}

.take {
  min-height: 48px;
  min-width: 200px;
  justify-content: center;
}
</style>
