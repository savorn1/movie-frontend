<script setup lang="ts">
import type { Product } from './KhqrPay.vue'

/*
 * Me page: buy coins or VIP for a friend (paid with KHQR like any order; paying makes a link to send),
 * redeem a code someone sent, and the gifts this viewer sent with whether each was opened.
 */
interface SentGift {
  code: string
  kind: 'COINS' | 'VIP'
  coins: number | null
  months: number | null
  message: string | null
  redeemed: boolean
  createdAt: string
}

const { viewer } = useViewer()
const { wallet, refresh } = useWallet()
const { prices, planPrice } = useSite()
const { success, fail } = useToast()

const sent = ref<SentGift[]>([])
const message = ref('')
const paying = ref<{ product: Product; label: string } | null>(null)
const code = ref('')
const redeeming = ref(false)

async function load() {
  if (!viewer.value) return
  sent.value = await $fetch<SentGift[]>('/api/gifts/mine').catch(() => [])
}
onMounted(load)
watch(() => viewer.value?.id, load)

const options = computed(() => [
  ...prices.value.coinPacks.slice(0, 2).map(p => ({
    key: `c${p.coins}`,
    label: `កាក់ ${kh(p.coins)}`,
    price: p.price,
    product: { kind: 'COINS' as const, coins: p.coins }
  })),
  ...([1, 3] as const).map(m => ({
    key: `v${m}`,
    label: `VIP ${kh(m)} ខែ`,
    price: planPrice(m),
    product: { kind: 'VIP' as const, months: m }
  }))
])

function give(o: (typeof options.value)[number]) {
  paying.value = {
    product: { ...o.product, gift: true, giftMessage: message.value.trim() || undefined },
    label: `កាដូ · ${o.label}`
  }
}

async function onPaid() {
  paying.value = null
  message.value = ''
  await load()
}

async function redeem() {
  redeeming.value = true
  try {
    const r = await $fetch<{ kind: string; coins: number | null; months: number | null }>('/api/gifts/redeem', {
      method: 'POST',
      body: { code: code.value }
    })
    code.value = ''
    await refresh()
    success(r.kind === 'VIP' ? `បានទទួល VIP ${kh(r.months ?? 0)} ខែ` : `បានទទួលកាក់ ${kh(r.coins ?? 0)}`)
  } catch (err) {
    fail(paymentError(err))
  } finally {
    redeeming.value = false
  }
}

const linkOf = (c: string) => `${window.location.origin}/gift/${c}`
async function copy(c: string) {
  try {
    await navigator.clipboard.writeText(linkOf(c))
    success('បានចម្លងតំណ')
  } catch {
    window.prompt('ចម្លងតំណនេះ', linkOf(c))
  }
}
</script>

<template>
  <section v-if="viewer && wallet" id="gifts" class="gifts" aria-labelledby="gifts-title">
    <h2 id="gifts-title"><AppIcon name="gift" :size="20" /> កាដូ</h2>

    <template v-if="wallet.paymentsOn">
      <p class="lead">ទិញកាក់ ឬ VIP ឱ្យមិត្ត ហើយផ្ញើតំណតាម Telegram។</p>
      <label class="msg">
        <span class="sr-only">សារជូនមិត្ត</span>
        <input v-model="message" maxlength="140" placeholder="សារជូនមិត្ត (មិនចាំបាច់)">
      </label>
      <div class="options">
        <button v-for="o in options" :key="o.key" type="button" class="option" @click="give(o)">
          <AppIcon :name="o.product.kind === 'VIP' ? 'crown' : 'coin'" :size="18" />
          <strong>{{ o.label }}</strong>
          <span>${{ o.price.toFixed(2) }}</span>
        </button>
      </div>
    </template>

    <form class="redeem" @submit.prevent="redeem">
      <label>
        <span>មានលេខកូដកាដូ?</span>
        <input v-model="code" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ឧ. K7Q2M9XPAB" maxlength="24">
      </label>
      <button type="submit" class="btn btn-primary" :disabled="redeeming || code.replace(/[\s-]/g, '').length < 6">ទទួល</button>
    </form>

    <details v-if="sent.length" class="sent">
      <summary>កាដូដែលអ្នកបានផ្ញើ ({{ kh(sent.length) }})</summary>
      <ul>
        <li v-for="g in sent" :key="g.code">
          <span>{{ g.kind === 'VIP' ? `VIP ${kh(g.months ?? 0)} ខែ` : `កាក់ ${kh(g.coins ?? 0)}` }}</span>
          <span class="state" :class="{ done: g.redeemed }">{{ g.redeemed ? 'មិត្តបានទទួល' : 'មិនទាន់ទទួល' }}</span>
          <button v-if="!g.redeemed" type="button" class="link" @click="copy(g.code)">ចម្លងតំណ</button>
        </li>
      </ul>
    </details>

    <KhqrPay v-if="paying" :product="paying.product" :label="paying.label" @paid="onPaid" @close="paying = null; load()" />
  </section>
</template>

<style scoped>
.gifts {
  display: grid;
  gap: 12px;
}

h2 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

h2 svg {
  color: #e5484d;
}

.lead {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
}

.msg input,
.redeem input {
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg-elev);
  color: var(--text);
  font: inherit;
}

.options {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 8px;
}

.option {
  display: grid;
  justify-items: center;
  gap: 2px;
  min-height: 72px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 14px;
  background: var(--bg-elev);
  color: var(--text);
}

.option:hover {
  border-color: #e5484d;
}

.option strong {
  color: var(--text-strong);
}

.redeem {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 8px;
}

.redeem label {
  display: grid;
  flex: 1 1 200px;
  gap: 4px;
  color: var(--text-muted);
  font-size: 14px;
}

.redeem input {
  font-family: ui-monospace, monospace;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.redeem .btn {
  min-height: 44px;
}

.sent summary {
  min-height: 44px;
  display: flex;
  align-items: center;
  color: var(--text-strong);
  cursor: pointer;
}

.sent ul {
  display: grid;
  gap: 6px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.sent li {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  font-size: 14px;
}

.state {
  color: var(--text-muted);
}

.state.done {
  color: #2fbf71;
}

.link {
  min-height: 36px;
  margin-left: auto;
  color: var(--text-strong);
  text-decoration: underline;
  text-underline-offset: 3px;
}
</style>
