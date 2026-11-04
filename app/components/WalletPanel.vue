<script setup lang="ts">
import type { Product } from './KhqrPay.vue'

// The Me page's wallet: coins, VIP time, the daily check-in, coin packs (KHQR) and recent payments.
// Shown to signed-in viewers when payments are on the server.
interface OrderRow {
  id: number
  kind: 'COINS' | 'SERIES' | 'VIP'
  amountUsd: number
  coins: number | null
  seriesTitle: string | null
  months: number | null
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED'
  createdAt: string
}

const { viewer } = useViewer()
const { wallet, refresh, checkIn } = useWallet()
const { prices } = useSite()
const { show } = useToast()

const orders = ref<OrderRow[]>([])
const paying = ref<{ product: Product; label: string } | null>(null)
const busy = ref(false)

async function load() {
  await refresh()
  orders.value = await $fetch<OrderRow[]>('/api/orders').catch(() => [])
}
onMounted(load)
watch(() => viewer.value?.id, load)

const vipUntil = computed(() => (wallet.value?.vipUntil ? new Date(wallet.value.vipUntil) : null))
// Seven dots: days of the current week-long streak, today's included once checked in
const streakDots = computed(() => {
  const w = wallet.value
  if (!w) return 0
  const done = w.checkIn.streak % 7 || (w.checkIn.streak ? 7 : 0)
  return w.checkIn.doneToday ? done : done % 7
})

async function onCheckIn() {
  busy.value = true
  try {
    const before = wallet.value?.coins ?? 0
    const w = await checkIn()
    show(`ចុះឈ្មោះប្រចាំថ្ងៃ · +${kh(w.coins - before)} កាក់`)
  } catch (err) {
    show(paymentError(err))
  } finally {
    busy.value = false
  }
}

async function onPaid() {
  paying.value = null
  await load()
  show('បានបញ្ចូលកាក់')
}

const statusLabel: Record<OrderRow['status'], string> = {
  PENDING: 'រង់ចាំ',
  PAID: 'បានបង់',
  EXPIRED: 'ផុតពេល',
  CANCELLED: 'បោះបង់'
}
const what = (o: OrderRow) =>
  o.kind === 'COINS' ? `កាក់ ${kh(o.coins ?? 0)}` : o.kind === 'VIP' ? `VIP ${kh(o.months ?? 0)} ខែ` : `រឿង “${o.seriesTitle ?? ''}”`
</script>

<template>
  <section v-if="viewer && wallet" class="wallet" aria-labelledby="wallet-title">
    <h2 id="wallet-title">កាបូប</h2>

    <div class="cards">
      <div class="stat">
        <span class="label">កាក់</span>
        <strong><AppIcon name="coin" :size="20" /> {{ kh(wallet.coins) }}</strong>
        <span class="sub">ដោះសោវគ្គ VIP មួយ = {{ kh(wallet.episodeCoins) }} កាក់</span>
      </div>
      <div class="stat">
        <span class="label">VIP</span>
        <strong>{{ wallet.vipActive ? 'សកម្ម' : 'មិនទាន់មាន' }}</strong>
        <span class="sub">
          <template v-if="wallet.vipActive && vipUntil">ដល់ {{ vipUntil.toLocaleDateString('en-GB') }}</template>
          <NuxtLink v-else to="/vip">មើលគម្រោង VIP</NuxtLink>
        </span>
      </div>
    </div>

    <div class="checkin">
      <div>
        <strong>ចុះឈ្មោះប្រចាំថ្ងៃ</strong>
        <span class="sub">មករាល់ថ្ងៃ ទទួលកាក់ឥតគិតថ្លៃ · ថ្ងៃទី ៧ ទទួលទ្វេដង</span>
        <span class="dots" :aria-label="`${streakDots} ថ្ងៃជាប់គ្នា`">
          <span v-for="d in 7" :key="d" class="dot" :class="{ on: d <= streakDots }" />
        </span>
      </div>
      <button type="button" class="btn btn-primary" :disabled="busy || wallet.checkIn.doneToday" @click="onCheckIn">
        {{ wallet.checkIn.doneToday ? 'បានទទួលហើយថ្ងៃនេះ' : `ទទួល +${kh(wallet.checkIn.nextReward)}` }}
      </button>
    </div>

    <div v-if="wallet.paymentsOn" class="packs">
      <button
        v-for="p in prices.coinPacks"
        :key="p.coins"
        type="button"
        class="pack"
        @click="paying = { product: { kind: 'COINS', coins: p.coins }, label: `ទិញកាក់ ${kh(p.coins)}` }"
      >
        <strong><AppIcon name="coin" :size="18" /> {{ kh(p.coins) }}</strong>
        <span>${{ p.price.toFixed(2) }}</span>
      </button>
    </div>

    <details v-if="orders.length" class="orders">
      <summary>ការបង់ប្រាក់ថ្មីៗ</summary>
      <ul>
        <li v-for="o in orders.slice(0, 10)" :key="o.id">
          <span>{{ what(o) }}</span>
          <span>${{ o.amountUsd.toFixed(2) }}</span>
          <span class="status" :class="o.status.toLowerCase()">{{ statusLabel[o.status] }}</span>
        </li>
      </ul>
    </details>

    <KhqrPay v-if="paying" :product="paying.product" :label="paying.label" @paid="onPaid" @close="paying = null; load()" />
  </section>
</template>

<style scoped>
.wallet {
  display: grid;
  gap: 12px;
}

h2 {
  margin: 0;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
}

.stat,
.checkin {
  display: grid;
  gap: 4px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-elev);
}

.stat strong {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 22px;
  color: var(--text-strong);
}

.label,
.sub {
  color: var(--text-muted);
  font-size: 13px;
}

.sub a {
  color: var(--accent);
}

.checkin {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.checkin > div {
  display: grid;
  gap: 4px;
}

.dots {
  display: flex;
  gap: 6px;
  margin-top: 4px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--border);
}

.dot.on {
  background: var(--accent);
}

.packs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.pack {
  display: grid;
  justify-items: center;
  gap: 4px;
  min-height: 72px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-elev);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.pack strong {
  display: flex;
  align-items: center;
  gap: 4px;
  color: var(--text-strong);
}

.pack:hover {
  border-color: var(--accent);
}

.orders summary {
  cursor: pointer;
  color: var(--text-muted);
}

.orders ul {
  display: grid;
  gap: 6px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.orders li {
  display: grid;
  grid-template-columns: 1fr auto auto;
  gap: 12px;
  font-size: 14px;
}

.status.paid {
  color: #2fbf71;
}

.status.pending {
  color: var(--accent);
}

.status.expired,
.status.cancelled {
  color: var(--text-muted);
}
</style>
