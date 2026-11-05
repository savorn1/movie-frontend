<script setup lang="ts">
/*
 * Pay with KHQR: makes the order, shows the code to scan with any Cambodian banking app (ABA, ACLEDA,
 * Wing…), and watches until it's paid. With Bakong connected the server confirms by itself within
 * seconds; otherwise an admin confirms, and this keeps checking (it's fine to close and come back:
 * whatever was bought is delivered to the account either way).
 *
 * Most viewers pay on the same phone they watch on, where they can't scan their own screen: "Save QR"
 * puts the code in their photos (share sheet on phones, a download elsewhere) so the banking app can
 * read it from the gallery. Once paid, a short success screen shows what they got before going back.
 */
export type Product = { kind: 'COINS'; coins: number } | { kind: 'SERIES'; seriesId: number } | { kind: 'VIP'; months: number }

interface Order {
  id: number
  amountUsd: number
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED'
  billNumber: string
  coins: number | null
  bonusCoins: number | null
  months: number | null
  qrSvg: string | null
  qrPng: string | null
  expiresAt: string
  createdAt: string
  autoConfirm: boolean
}

const props = defineProps<{ product: Product; label: string; doneLabel?: string }>()
const emit = defineEmits<{ paid: []; close: [] }>()

const order = ref<Order | null>(null)
const route = useRoute()
const error = ref('')
const now = ref(Date.now())
const saving = ref(false)
const shown = ref(0)
let poll: ReturnType<typeof setTimeout> | undefined
let clock: ReturnType<typeof setInterval> | undefined
let counter: number | undefined

const secondsLeft = computed(() => (order.value ? Math.max(0, Math.round((Date.parse(order.value.expiresAt) - now.value) / 1000)) : 0))
const totalSeconds = computed(() => (order.value ? Math.max(1, (Date.parse(order.value.expiresAt) - Date.parse(order.value.createdAt)) / 1000) : 1))
const countdown = computed(() => `${Math.floor(secondsLeft.value / 60)}:${String(secondsLeft.value % 60).padStart(2, '0')}`)
const urgent = computed(() => secondsLeft.value > 0 && secondsLeft.value <= 60)
const paid = computed(() => order.value?.status === 'PAID')
const gotCoins = computed(() => (order.value?.coins ?? 0) + (order.value?.bonusCoins ?? 0))

async function start() {
  error.value = ''
  order.value = null
  try {
    order.value = await $fetch<Order>('/api/orders', { method: 'POST', body: props.product })
    // If they close this and pay later, the notice can bring them back here
    rememberOrderReturn(order.value.id, route.fullPath)
    schedule()
  } catch (err) {
    error.value = paymentError(err)
    haptic('error')
  }
}

function schedule() {
  clearTimeout(poll)
  // Bakong answers within seconds; an admin takes longer, so check less often
  poll = setTimeout(check, order.value?.autoConfirm ? 3000 : 10_000)
}

async function check() {
  if (!order.value) return
  try {
    const fresh = await $fetch<Order>(`/api/orders/${order.value.id}`)
    // Keep the code on screen until it's actually gone
    const keep = fresh.status === 'PENDING'
    order.value = { ...fresh, qrSvg: fresh.qrSvg ?? (keep ? order.value.qrSvg : null), qrPng: fresh.qrPng ?? (keep ? order.value.qrPng : null) }
  } catch {
    // Offline for a moment: try again
  }
  if (order.value.status === 'PAID') {
    celebrate()
    return
  }
  if (order.value.status === 'PENDING') schedule()
}

// Coins count up to what arrived; VIP and series show their badge
function celebrate() {
  haptic('success')
  // Seen here, so the late-payment notice won't repeat it
  if (order.value) {
    forgetOrderReturn(order.value.id)
    $fetch(`/api/orders/${order.value.id}/seen`, { method: 'POST' }).catch(() => {})
  }
  const target = gotCoins.value
  if (!target || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    shown.value = target
    return
  }
  const t0 = performance.now()
  const step = (t: number) => {
    const k = Math.min(1, (t - t0) / 900)
    shown.value = Math.round(target * (1 - (1 - k) ** 3))
    if (k < 1) counter = requestAnimationFrame(step)
  }
  counter = requestAnimationFrame(step)
}

/** The QR on a white card with the amount and bill number, as a PNG file */
async function qrFile(): Promise<File | null> {
  const o = order.value
  if (!o?.qrPng) return null
  const img = new Image()
  img.src = o.qrPng
  await img.decode()
  const W = 720
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = W + 180
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = '#e1232e'
  ctx.fillRect(0, 0, W, 72)
  ctx.fillStyle = '#fff'
  ctx.font = 'bold 34px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillText('KHQR · RuengFlix', W / 2, 48)
  ctx.drawImage(img, 40, 96, W - 80, W - 80)
  ctx.fillStyle = '#111'
  ctx.font = 'bold 48px system-ui, sans-serif'
  ctx.fillText(`$${o.amountUsd.toFixed(2)}`, W / 2, W + 76)
  ctx.fillStyle = '#555'
  ctx.font = '26px system-ui, sans-serif'
  ctx.fillText(o.billNumber, W / 2, W + 124)
  const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/png'))
  return blob ? new File([blob], `khqr-${o.billNumber}.png`, { type: 'image/png' }) : null
}

async function saveQr() {
  saving.value = true
  try {
    const file = await qrFile()
    if (!file) return
    // Phones and tablets: the share sheet has "Save image" (into the gallery the banking app reads);
    // computers get a plain download
    const touch = window.matchMedia?.('(pointer: coarse)').matches
    if (touch && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'KHQR' })
        haptic('tap')
        return
      } catch (err) {
        if ((err as DOMException)?.name === 'AbortError') return
      }
    }
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    haptic('tap')
  } finally {
    saving.value = false
  }
}

function finish() {
  emit('paid')
}

function close() {
  // Closing the success screen still counts as done
  if (paid.value) finish()
  else emit('close')
}

const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close()

onMounted(() => {
  start()
  clock = setInterval(() => (now.value = Date.now()), 1000)
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  clearTimeout(poll)
  clearInterval(clock)
  if (counter) cancelAnimationFrame(counter)
  window.removeEventListener('keydown', onKey)
})
</script>

<template>
  <div class="pay" role="dialog" aria-modal="true" aria-labelledby="pay-title" @click.self="close">
    <div class="sheet" :class="{ won: paid }">
      <button type="button" class="close" aria-label="បិទ" @click="close"><AppIcon name="close" :size="20" /></button>

      <template v-if="paid && order">
        <div class="burst" aria-hidden="true">
          <span v-for="i in 12" :key="i" :style="{ '--i': i }" />
        </div>
        <span class="badge" :class="product.kind.toLowerCase()">
          <AppIcon :name="product.kind === 'COINS' ? 'coin' : product.kind === 'VIP' ? 'crown' : 'check'" :size="34" />
        </span>
        <h2 id="pay-title">បង់ប្រាក់រួចរាល់!</h2>
        <p v-if="product.kind === 'COINS'" class="gain" aria-live="polite">+{{ kh(shown) }} <small>កាក់</small></p>
        <p v-if="order.bonusCoins" class="bonus"><AppIcon name="gift" :size="16" /> រួមទាំងកាក់បន្ថែម {{ kh(order.bonusCoins) }} សម្រាប់ការទិញលើកដំបូង</p>
        <p v-else-if="product.kind === 'VIP'" class="muted">អ្នកជាសមាជិក VIP {{ kh(order.months ?? 0) }} ខែ · គ្រប់វគ្គបើកហើយ</p>
        <p v-else-if="product.kind === 'SERIES'" class="muted">{{ label }} · គ្រប់វគ្គបើកហើយ</p>
        <button type="button" class="btn btn-primary wide" autofocus @click="finish">{{ doneLabel ?? 'បន្ត' }}</button>
      </template>

      <template v-else>
        <h2 id="pay-title">{{ label }}</h2>

        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <p v-else-if="!order" class="muted">កំពុងរៀបចំ KHQR…</p>

        <template v-else-if="order.status === 'PENDING'">
          <p class="amount">${{ order.amountUsd.toFixed(2) }}</p>
          <!-- SVG made on our server from the KHQR text -->
          <div v-if="order.qrSvg && secondsLeft > 0" class="qr" role="img" aria-label="KHQR សម្រាប់ស្កេនបង់ប្រាក់" v-html="order.qrSvg" />
          <div v-if="secondsLeft > 0" class="timer" :class="{ urgent }">
            <span class="track"><span class="fill" :style="{ width: `${(secondsLeft / totalSeconds) * 100}%` }" /></span>
            <span>នៅសល់ <strong>{{ countdown }}</strong></span>
          </div>
          <button v-if="order.qrPng && secondsLeft > 0" type="button" class="btn btn-outline wide" :disabled="saving" @click="saveQr">
            <AppIcon name="download" :size="18" /> រក្សាទុក QR
          </button>
          <ol v-if="secondsLeft > 0" class="steps">
            <li>ស្កេនពីឧបករណ៍ផ្សេង ឬចុច <strong>រក្សាទុក QR</strong></li>
            <li>បើក ABA, ACLEDA, Wing ឬ Bakong → ស្កេន → ជ្រើសរូបពី Gallery</li>
            <li>បង់ប្រាក់ ហើយត្រឡប់មកវិញ · យើងនឹងដោះសោឲ្យដោយស្វ័យប្រវត្តិ</li>
          </ol>
          <p v-if="!order.autoConfirm" class="note">
            បន្ទាប់ពីបង់ប្រាក់ យើងនឹងផ្ទៀងផ្ទាត់ ហើយដោះសោឲ្យក្នុងរយៈពេលពីរបីនាទី។ អ្នកអាចបិទផ្ទាំងនេះបាន។
          </p>
          <p v-else-if="secondsLeft === 0" class="muted">កំពុងពិនិត្យការបង់ប្រាក់…</p>
          <p class="bill">លេខវិក្កយបត្រ {{ order.billNumber }}</p>
        </template>

        <template v-else>
          <p class="muted">{{ order.status === 'EXPIRED' ? 'KHQR ផុតពេលហើយ' : 'ការបញ្ជាទិញត្រូវបានបោះបង់' }}</p>
          <button type="button" class="btn btn-primary" @click="start">បង្កើត KHQR ថ្មី</button>
        </template>
      </template>
    </div>
  </div>
</template>

<style scoped>
.pay {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: grid;
  place-items: center;
  padding: 16px;
  background: rgba(0, 0, 0, 0.6);
}

.sheet {
  position: relative;
  display: grid;
  justify-items: center;
  gap: 10px;
  width: min(360px, 100%);
  padding: 24px 20px 20px;
  border-radius: 16px;
  background: var(--bg-elev);
  color: var(--text);
  text-align: center;
}

.close {
  position: absolute;
  top: 8px;
  right: 8px;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 0;
  border-radius: 50%;
  background: none;
  color: var(--text-muted);
  cursor: pointer;
}

h2 {
  margin: 0 32px;
  font-size: 18px;
  color: var(--text-strong);
}

.amount {
  margin: 0;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-strong);
}

.qr {
  width: 240px;
  max-width: 100%;
  padding: 10px;
  border-radius: 12px;
  /* QR codes need dark on light to scan, in either theme */
  background: #fff;
}

.qr :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}

.muted,
.bill {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
}

.bill {
  font-size: 12px;
}

.note {
  margin: 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--bg);
  font-size: 14px;
}

.done {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 8px 0;
  color: #2fbf71;
  font-weight: 700;
}

.error {
  margin: 0;
  color: #ff6b6b;
}

.wide {
  width: 100%;
  min-height: 46px;
  justify-content: center;
  gap: 8px;
}

.timer {
  display: grid;
  gap: 6px;
  width: 240px;
  max-width: 100%;
  color: var(--text-muted);
  font-size: 14px;
}

.track {
  height: 4px;
  border-radius: 2px;
  background: var(--border);
  overflow: hidden;
}

.fill {
  display: block;
  height: 100%;
  background: var(--accent);
  transition: width 1s linear;
}

.timer.urgent {
  color: #ff6b6b;
}

.timer.urgent .fill {
  background: #ff6b6b;
}

.steps {
  display: grid;
  gap: 4px;
  margin: 0;
  padding-left: 20px;
  color: var(--text-muted);
  font-size: 13px;
  text-align: left;
}

/* Success */
.won {
  overflow: hidden;
  padding-top: 32px;
}

.badge {
  display: grid;
  place-items: center;
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: #2fbf71;
  color: #fff;
  animation: pop 0.45s cubic-bezier(0.2, 1.4, 0.4, 1) both;
}

.badge.coins,
.badge.vip {
  background: linear-gradient(135deg, #ffe26a, #ffb800);
  color: #3a2600;
}

.gain {
  margin: 0;
  font-size: 40px;
  font-weight: 800;
  color: var(--accent-text, var(--accent));
  font-variant-numeric: tabular-nums;
}

.gain small {
  font-size: 18px;
  font-weight: 600;
}

.bonus {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: #2fbf71;
  font-size: 14px;
}

.burst {
  position: absolute;
  top: 68px;
  left: 50%;
  pointer-events: none;
}

.burst span {
  position: absolute;
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: hsl(calc(var(--i) * 30) 90% 60%);
  animation: fly 0.9s ease-out both;
  --a: calc(var(--i) * 30deg);
}

@keyframes pop {
  from {
    transform: scale(0.3);
    opacity: 0;
  }
}

@keyframes fly {
  from {
    transform: rotate(var(--a)) translateY(0);
    opacity: 1;
  }
  to {
    transform: rotate(var(--a)) translateY(-110px);
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .badge,
  .burst span {
    animation: none;
  }

  .burst {
    display: none;
  }

  .fill {
    transition: none;
  }
}
</style>
