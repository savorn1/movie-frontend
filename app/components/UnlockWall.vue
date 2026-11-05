<script setup lang="ts">
import type { Movie } from '#shared/data/movies'
import type { Product } from './KhqrPay.vue'

// `previewed`: the viewer just watched the free opening of this episode (the wall sits over its last frame)
const props = defineProps<{ movie: Movie; ep: number; previewed?: boolean }>()
const emit = defineEmits<{ unlocked: [] }>()

const { unlockSeries } = useLibrary()
const { success, fail } = useToast()
const { prices, planPrice } = useSite()
const { viewer, enabled: accountsOn } = useViewer()
const { wallet, refresh: refreshWallet, unlockEpisode } = useWallet()
const { reload } = useSeriesEpisodes()
const route = useRoute()

const isDev = import.meta.dev
const busy = ref(false)
const error = ref('')
const paying = ref<{ product: Product; label: string; doneLabel?: string } | null>(null)
/** Coins are being bought to unlock this episode: unlock it as soon as they arrive */
const thenUnlock = ref(false)

/*
 * Episodes of movie-api series are sold for real: one episode with coins, the whole series or VIP with
 * KHQR. Only the server decides what's unlocked, so after paying we ask it again before playing.
 * The sample series have no payments; in development a button stands in.
 */
const sells = computed(() => !!props.movie.remote && accountsOn.value)
const episodeCoins = computed(() => wallet.value?.episodeCoins ?? 20)
const enoughCoins = computed(() => (wallet.value?.coins ?? 0) >= episodeCoins.value)
// The smallest pack that covers what's missing for this episode
const topUp = computed(() => {
  const missing = episodeCoins.value - (wallet.value?.coins ?? 0)
  const packs = prices.value.coinPacks
  return packs.find(p => p.coins >= missing) ?? packs[packs.length - 1] ?? { coins: 100 as const, price: 0.99 }
})
const bonusPercent = computed(() => wallet.value?.firstTopUpBonusPercent ?? 0)
const loginLink = computed(() => ({ path: '/login', query: { next: route.fullPath } }))
const vipLink = computed(() => ({ path: '/vip', query: { next: route.fullPath } }))

onMounted(() => {
  if (viewer.value) refreshWallet()
})
watch(() => viewer.value?.id, (id) => id && refreshWallet())

async function opened(message: string) {
  await reload(props.movie.id)
  // Let the player see the new links before it tries again
  await nextTick()
  success(message)
  emit('unlocked')
}

async function payWithCoins() {
  error.value = ''
  busy.value = true
  try {
    const r = await unlockEpisode(props.movie.id, props.ep)
    await opened(r.charged ? `បានដោះសោវគ្គ ${kh(props.ep)} · −${kh(r.charged)} កាក់` : `វគ្គ ${kh(props.ep)} បានដោះសោរួចហើយ`)
  } catch (err) {
    error.value = paymentError(err)
    haptic('error')
  } finally {
    busy.value = false
  }
}

function buy(product: Product, label: string, doneLabel?: string) {
  paying.value = { product, label, doneLabel }
}

/** One step for viewers short of coins: buy the pack that covers it, then unlock this episode with it */
function topUpAndUnlock() {
  thenUnlock.value = true
  buy({ kind: 'COINS', coins: topUp.value.coins }, `ទិញកាក់ ${kh(topUp.value.coins)} ហើយដោះសោវគ្គ ${kh(props.ep)}`, `ដោះសោ និងមើលវគ្គ ${kh(props.ep)}`)
}

async function onPaid() {
  const kind = paying.value?.product.kind
  paying.value = null
  await refreshWallet()
  if (kind === 'COINS') {
    if (thenUnlock.value && enoughCoins.value) {
      thenUnlock.value = false
      await payWithCoins()
    } else {
      success('បានបញ្ចូលកាក់')
    }
    return
  }
  await opened(kind === 'VIP' ? 'អ្នកជាសមាជិក VIP ហើយ' : `បានដោះសោ “${props.movie.title}”`)
}

function onPayClosed() {
  paying.value = null
  thenUnlock.value = false
}

function simulateUnlock() {
  unlockSeries(props.movie.id)
  success(`បានដោះសោ “${props.movie.title}”`)
  emit('unlocked')
}
</script>

<template>
  <div class="wall" role="dialog" aria-modal="false" aria-labelledby="wall-title" @click.stop>
    <div class="card">
      <span class="lock"><AppIcon name="lock" :size="22" solid /></span>
      <h2 id="wall-title">{{ previewed ? 'ចង់ដឹងរឿងបន្តទេ?' : `វគ្គ ${kh(ep)} ជាវគ្គ VIP` }}</h2>
      <p class="lead">
        <template v-if="previewed">អ្នកបានមើលផ្នែកដំបូងនៃវគ្គ {{ kh(ep) }} ហើយ។ ដោះសោដើម្បីមើលបន្តពីត្រង់នេះ។</template>
        <template v-else>អ្នកបានមើលវគ្គឥតគិតថ្លៃ ១–{{ kh(movie.freeEpisodes) }} ហើយ។ ដោះសោដើម្បីដឹងរឿងបន្ត។</template>
      </p>

      <template v-if="sells && !viewer">
        <NuxtLink :to="loginLink" class="btn btn-primary signin">ចូលគណនីដើម្បីដោះសោ</NuxtLink>
        <p class="hint">ការដោះសោរក្សាទុកក្នុងគណនី ហើយមើលបានលើគ្រប់ឧបករណ៍។</p>
      </template>

      <div v-else-if="sells" class="options">
        <button v-if="enoughCoins" type="button" class="option primary" :disabled="busy" @click="payWithCoins">
          <span class="o-head">
            <strong>ដោះសោវគ្គនេះ</strong>
            <span class="price"><AppIcon name="coin" :size="18" /> {{ kh(episodeCoins) }}</span>
          </span>
          <span class="o-sub">អ្នកមាន {{ kh(wallet?.coins ?? 0) }} កាក់ · នៅសល់ {{ kh((wallet?.coins ?? 0) - episodeCoins) }} ក្រោយដោះសោ</span>
        </button>
        <button v-else type="button" class="option primary" :disabled="busy || !wallet?.paymentsOn" @click="topUpAndUnlock">
          <span v-if="bonusPercent" class="tag bonus"><AppIcon name="gift" :size="13" /> +{{ kh(bonusPercent) }}% លើកដំបូង</span>
          <span class="o-head">
            <strong>ទិញកាក់ {{ kh(topUp.coins) }} ហើយដោះសោ</strong>
            <span class="price">${{ topUp.price.toFixed(2) }}</span>
          </span>
          <span class="o-sub">
            វគ្គនេះ {{ kh(episodeCoins) }} កាក់ · អ្នកមាន {{ kh(wallet?.coins ?? 0) }}<template v-if="bonusPercent"> · ទទួលបាន {{ kh(topUp.coins + Math.floor(topUp.coins * bonusPercent / 100)) }} កាក់</template>
          </span>
        </button>
        <button type="button" class="option" @click="buy({ kind: 'SERIES', seriesId: movie.id }, `ដោះសោ “${movie.title}”`)">
          <span class="o-head">
            <strong>ដោះសោរឿងនេះទាំងមូល</strong>
            <span class="price">${{ prices.seriesUnlock }}</span>
          </span>
          <span class="o-sub">គ្រប់វគ្គទាំង {{ kh(movie.episodes) }} · បង់ម្តងតាម KHQR</span>
        </button>
        <NuxtLink :to="vipLink" class="option vip">
          <span class="tag">តម្លៃល្អបំផុត</span>
          <span class="o-head">
            <strong><AppIcon name="crown" :size="16" /> VIP គ្រប់រឿង</strong>
            <span class="price">${{ planPrice(1) }}<small>/ខែ</small></span>
          </span>
          <span class="o-sub">ដោះសោរាល់រឿង VIP · Full HD · ថ្លៃជាងវគ្គមួយៗ ពេលមើលច្រើន</span>
        </NuxtLink>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
      </div>

      <div v-else class="options">
        <div class="khqr" role="status">
          <p>ការបង់ប្រាក់មិនទាន់ដំណើរការសម្រាប់រឿងនេះនៅឡើយទេ។</p>
          <button v-if="isDev" type="button" class="btn btn-primary" @click="simulateUnlock">សាកល្បងដោះសោ (dev)</button>
        </div>
        <NuxtLink to="/vip" class="option">
          <span class="o-head">
            <strong>VIP គ្រប់រឿង</strong>
            <span class="price">${{ planPrice(1) }}<small>/ខែ</small></span>
          </span>
          <span class="o-sub">ដោះសោរាល់រឿង VIP · Full HD</span>
        </NuxtLink>
      </div>

      <NuxtLink :to="`/watch/${movie.id}/${movie.freeEpisodes}`" class="back">
        ត្រឡប់ទៅវគ្គ {{ kh(movie.freeEpisodes) }}
      </NuxtLink>
    </div>

    <KhqrPay
      v-if="paying"
      :product="paying.product"
      :label="paying.label"
      :done-label="paying.doneLabel ?? `មើលវគ្គ ${kh(ep)}`"
      @paid="onPaid"
      @close="onPayClosed"
    />
  </div>
</template>

<style scoped>
.wall {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: grid;
  place-items: center;
  padding: 16px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(6px);
}

@media (prefers-reduced-transparency: reduce) {
  .wall {
    background: rgba(0, 0, 0, 0.92);
    backdrop-filter: none;
  }
}

.card {
  display: grid;
  justify-items: center;
  gap: 10px;
  width: min(420px, 100%);
  text-align: center;
}

.lock {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffe26a, #ffb800);
  color: #3a2600;
}

h2 {
  margin: 0;
  font-family: var(--font-display);
  font-size: 26px;
  font-weight: 400;
}

.lead {
  margin: 0 0 4px;
  color: rgba(255, 255, 255, 0.85);
}

.options {
  display: grid;
  gap: 10px;
  width: 100%;
}

.option {
  display: grid;
  gap: 2px;
  width: 100%;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  text-align: left;
}

.option:hover {
  background: rgba(255, 255, 255, 0.14);
}

.option.primary {
  border-color: var(--accent);
  background: rgba(255, 209, 1, 0.12);
}

.option {
  position: relative;
}

.option.vip {
  border-color: rgba(255, 196, 0, 0.6);
}

.o-head strong {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.tag {
  position: absolute;
  top: -9px;
  right: 12px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  background: linear-gradient(135deg, #ffe26a, #ffb800);
  color: #3a2600;
  font-size: 12px;
  font-weight: 700;
}

.tag.bonus {
  background: #2fbf71;
  color: #fff;
}

.o-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12px;
}

.price {
  font-size: 20px;
  font-weight: 700;
}

.price small {
  margin-left: 2px;
  font-size: 13px;
  font-weight: 500;
}

.o-sub {
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}

.khqr {
  display: grid;
  justify-items: center;
  gap: 8px;
  width: 100%;
  padding: 12px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08);
}

.khqr p {
  margin: 0;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
}

.option:disabled {
  opacity: 0.6;
}

.price {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.signin {
  min-height: 48px;
  justify-content: center;
  width: 100%;
}

.hint {
  margin: 0;
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}

.error {
  margin: 0;
  color: #ff8a8a;
  font-size: 14px;
}

.back {
  min-height: 44px;
  display: grid;
  place-items: center;
  color: rgba(255, 255, 255, 0.85);
  font-size: 14px;
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
