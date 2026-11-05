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
  bonusCoins: number | null
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED'
  createdAt: string
}

const { viewer } = useViewer()
const { wallet, refresh, checkIn } = useWallet()
const { prices } = useSite()
const { success, fail } = useToast()
const route = useRoute()

const orders = ref<OrderRow[]>([])
const paying = ref<{ product: Product; label: string } | null>(null)
const busy = ref(false)
/** First load finished (the skeleton shows until then) */
const loaded = ref(false)

async function load() {
  await refresh()
  orders.value = await $fetch<OrderRow[]>('/api/orders').catch(() => [])
  loaded.value = true
}
onMounted(async () => {
  await load()
  // Opened from the header's coin chip: bring the wallet into view once it's drawn
  if (route.hash === '#wallet') {
    await nextTick()
    document.getElementById('wallet')?.scrollIntoView({ block: 'start' })
  }
})
watch(() => viewer.value?.id, load)

const vipUntil = computed(() => (wallet.value?.vipUntil ? new Date(wallet.value.vipUntil) : null))
// The week of the streak: days already collected, today's (next) day, and day 7 that pays double
const streakDots = computed(() => {
  const w = wallet.value
  if (!w) return 0
  const done = w.checkIn.streak % 7 || (w.checkIn.streak ? 7 : 0)
  return w.checkIn.doneToday ? done : done % 7
})
const todayDot = computed(() => (wallet.value?.checkIn.doneToday ? streakDots.value : streakDots.value + 1))
const base = computed(() => (wallet.value ? (todayDot.value === 7 ? wallet.value.checkIn.nextReward / 2 : wallet.value.checkIn.nextReward) : 0))
const bonus = computed(() => wallet.value?.firstTopUpBonusPercent ?? 0)
const withBonus = (coins: number) => coins + Math.floor((coins * bonus.value) / 100)

const { fly } = useCoinFlight()
const justCheckedIn = ref(false)

async function onCheckIn(e: MouseEvent) {
  const button = e.currentTarget as HTMLElement
  busy.value = true
  try {
    const before = wallet.value?.coins ?? 0
    fly(button, wallet.value?.checkIn.nextReward ?? 5)
    const w = await checkIn()
    justCheckedIn.value = true
    success(`ចុះឈ្មោះប្រចាំថ្ងៃ · +${kh(w.coins - before)} កាក់ · ${kh(w.checkIn.streak)} ថ្ងៃជាប់គ្នា`)
  } catch (err) {
    fail(paymentError(err))
  } finally {
    busy.value = false
  }
}

async function onPaid() {
  paying.value = null
  await load()
}

const statusLabel: Record<OrderRow['status'], string> = {
  PENDING: 'រង់ចាំ',
  PAID: 'បានបង់',
  EXPIRED: 'ផុតពេល',
  CANCELLED: 'បោះបង់'
}
const what = (o: OrderRow) =>
  o.kind === 'COINS' ? `កាក់ ${kh(o.coins ?? 0)}${o.bonusCoins ? ` + ${kh(o.bonusCoins)}` : ''}` : o.kind === 'VIP' ? `VIP ${kh(o.months ?? 0)} ខែ` : `រឿង “${o.seriesTitle ?? ''}”`
</script>

<template>
  <Transition name="swap" mode="out-in">
  <section v-if="viewer && wallet" id="wallet" class="wallet" aria-labelledby="wallet-title">
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
        <ol class="week" :aria-label="`${kh(streakDots)} ថ្ងៃជាប់គ្នា ក្នុងសប្តាហ៍នេះ`">
          <li
            v-for="d in 7"
            :key="d"
            class="day"
            :class="{ on: d <= streakDots, today: d === todayDot && !wallet.checkIn.doneToday, big: d === 7, just: justCheckedIn && d === streakDots }"
          >
            <span class="ring">
              <AppIcon v-if="d <= streakDots" name="check" :size="14" />
              <AppIcon v-else-if="d === 7" name="gift" :size="14" />
              <template v-else>+{{ kh(base) }}</template>
            </span>
            <small>{{ d === 7 ? '×២' : `ថ្ងៃ${kh(d)}` }}</small>
          </li>
        </ol>
      </div>
      <button type="button" class="btn btn-primary" :disabled="busy || wallet.checkIn.doneToday" @click="onCheckIn">
        {{ wallet.checkIn.doneToday ? 'បានទទួលហើយថ្ងៃនេះ' : `ទទួល +${kh(wallet.checkIn.nextReward)}` }}
      </button>
    </div>

    <p v-if="wallet.paymentsOn && bonus" class="first-bonus">
      <AppIcon name="gift" :size="18" /> ការទិញកាក់លើកដំបូង ទទួលបានកាក់បន្ថែម <strong>+{{ kh(bonus) }}%</strong>
    </p>
    <div v-if="wallet.paymentsOn" class="packs">
      <button
        v-for="p in prices.coinPacks"
        :key="p.coins"
        type="button"
        class="pack"
        @click="paying = { product: { kind: 'COINS', coins: p.coins }, label: `ទិញកាក់ ${kh(p.coins)}` }"
      >
        <strong><AppIcon name="coin" :size="18" /> {{ kh(p.coins) }}</strong>
        <small v-if="bonus" class="extra">+{{ kh(withBonus(p.coins) - p.coins) }} បន្ថែម</small>
        <span>${{ p.price.toFixed(2) }}</span>
        <small class="khr">≈ {{ riel(p.price) }}</small>
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

    <KhqrPay
      v-if="paying"
      :product="paying.product"
      :label="paying.label"
      done-label="រួចរាល់"
      @paid="onPaid"
      @close="paying = null; load()"
    />
  </section>
  <section v-else-if="viewer && !loaded" class="wallet" aria-busy="true" aria-label="កំពុងផ្ទុកកាបូប">
    <h2>កាបូប</h2>
    <div class="cards">
      <span class="sk shimmer" />
      <span class="sk shimmer" />
    </div>
    <span class="sk tall shimmer" />
  </section>
  </Transition>
</template>

<style scoped>
.wallet {
  display: grid;
  /* Never wider than the screen, whatever a row inside wants */
  grid-template-columns: minmax(0, 1fr);
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

.week {
  display: flex;
  gap: 6px;
  margin: 8px 0 0;
  padding: 0;
  list-style: none;
}

.day {
  display: grid;
  justify-items: center;
  gap: 2px;
  color: var(--text-muted);
  font-size: 13px;
}

.day small {
  font-size: inherit; /* <small> would shrink the Khmer day name below 13px */
}

.ring {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1.5px dashed var(--border);
  font-size: 11px;
  font-weight: 700;
}

.day.on .ring {
  border: 0;
  background: var(--accent);
  color: var(--accent-ink);
}

.day.today .ring {
  border: 2px solid var(--accent);
  color: var(--text-strong);
}

.day.big .ring {
  border-color: #ffb800;
  color: #ffb800;
}

/* Today's circle fills with a sweep right after checking in; day 7 bursts */
.day.just .ring {
  animation: pop-in var(--dur-slow) var(--ease-spring);
}

.day.just .ring::before {
  content: '';
  position: absolute;
  inset: -3px;
  border-radius: 50%;
  background: conic-gradient(var(--accent) var(--sweep), transparent 0);
  -webkit-mask: radial-gradient(circle, transparent 17px, #000 18px);
  mask: radial-gradient(circle, transparent 17px, #000 18px);
  animation: sweep 500ms var(--ease-out) forwards;
}

.day.big.just .ring::after {
  content: '';
  position: absolute;
  inset: -10px;
  border-radius: 50%;
  border: 2px solid #ffb800;
  animation: ring-burst 600ms var(--ease-out) forwards;
}

.day.big.just small {
  display: inline-block;
  animation: pop-in 450ms var(--ease-spring) 200ms both;
}

.ring {
  position: relative;
}

@property --sweep {
  syntax: '<angle>';
  inherits: false;
  initial-value: 0deg;
}

@keyframes sweep {
  to {
    --sweep: 360deg;
    opacity: 0;
  }
}

@keyframes ring-burst {
  from {
    transform: scale(0.6);
    opacity: 1;
  }
  to {
    transform: scale(1.4);
    opacity: 0;
  }
}

.day.big.on .ring {
  background: linear-gradient(135deg, #ffe26a, #ffb800);
  color: #3a2600;
}

.first-bonus {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(47, 191, 113, 0.12);
  color: var(--text-strong);
  font-size: 14px;
}

.first-bonus svg {
  color: #2fbf71;
}

.extra {
  color: #2fbf71;
  font-size: 13px;
  font-weight: 600;
}

.sk {
  display: block;
  height: 86px;
  border-radius: 14px;
}

.sk.tall {
  height: 104px;
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
  min-width: 0;
  min-height: 72px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-elev);
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

/* Riel guide next to dollar prices */
.khr {
  color: var(--text-muted);
  font-size: 13px;
  font-weight: 500;
  white-space: nowrap;
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

/* 320 px phones: three packs still fit side by side */
@media (max-width: 359px) {
  .packs {
    gap: 6px;
  }

  .pack {
    padding: 8px 4px;
    font-size: 13px;
  }

  /* Seven check-in circles in one row */
  .week {
    gap: 4px;
  }

  .ring {
    width: 30px;
    height: 30px;
  }
}
</style>
