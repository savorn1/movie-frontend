<script setup lang="ts">
/*
 * Pay with KHQR: makes the order, shows the code to scan with any Cambodian banking app (ABA, ACLEDA,
 * Wing…), and watches until it's paid. With Bakong connected the server confirms by itself within
 * seconds; otherwise an admin confirms, and this keeps checking (it's fine to close and come back:
 * whatever was bought is delivered to the account either way).
 */
export type Product = { kind: 'COINS'; coins: number } | { kind: 'SERIES'; seriesId: number } | { kind: 'VIP'; months: number }

interface Order {
  id: number
  amountUsd: number
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED'
  billNumber: string
  qrSvg: string | null
  expiresAt: string
  autoConfirm: boolean
}

const props = defineProps<{ product: Product; label: string }>()
const emit = defineEmits<{ paid: []; close: [] }>()

const order = ref<Order | null>(null)
const error = ref('')
const now = ref(Date.now())
let poll: ReturnType<typeof setTimeout> | undefined
let clock: ReturnType<typeof setInterval> | undefined

const secondsLeft = computed(() => (order.value ? Math.max(0, Math.round((Date.parse(order.value.expiresAt) - now.value) / 1000)) : 0))
const countdown = computed(() => `${Math.floor(secondsLeft.value / 60)}:${String(secondsLeft.value % 60).padStart(2, '0')}`)

async function start() {
  error.value = ''
  order.value = null
  try {
    order.value = await $fetch<Order>('/api/orders', { method: 'POST', body: props.product })
    schedule()
  } catch (err) {
    error.value = paymentError(err)
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
    order.value = { ...fresh, qrSvg: fresh.qrSvg ?? (fresh.status === 'PENDING' ? order.value.qrSvg : null) }
  } catch {
    // Offline for a moment: try again
  }
  if (order.value.status === 'PAID') {
    emit('paid')
    return
  }
  if (order.value.status === 'PENDING') schedule()
}

onMounted(() => {
  start()
  clock = setInterval(() => (now.value = Date.now()), 1000)
})
onBeforeUnmount(() => {
  clearTimeout(poll)
  clearInterval(clock)
})
</script>

<template>
  <div class="pay" role="dialog" aria-modal="true" aria-labelledby="pay-title" @click.self="emit('close')">
    <div class="sheet">
      <button type="button" class="close" aria-label="បិទ" @click="emit('close')"><AppIcon name="close" :size="20" /></button>
      <h2 id="pay-title">{{ label }}</h2>

      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <p v-else-if="!order" class="muted">កំពុងរៀបចំ KHQR…</p>

      <template v-else-if="order.status === 'PENDING'">
        <p class="amount">${{ order.amountUsd.toFixed(2) }}</p>
        <!-- SVG made on our server from the KHQR text -->
        <div v-if="order.qrSvg && secondsLeft > 0" class="qr" role="img" aria-label="KHQR សម្រាប់ស្កេនបង់ប្រាក់" v-html="order.qrSvg" />
        <p v-if="secondsLeft > 0" class="muted">
          ស្កេនជាមួយកម្មវិធីធនាគារណាមួយ (ABA, ACLEDA, Wing…) · នៅសល់ <strong>{{ countdown }}</strong>
        </p>
        <p v-if="!order.autoConfirm" class="note">
          បន្ទាប់ពីបង់ប្រាក់ យើងនឹងផ្ទៀងផ្ទាត់ ហើយដោះសោឲ្យដោយស្វ័យប្រវត្តិក្នុងរយៈពេលពីរបីនាទី។ អ្នកអាចបិទផ្ទាំងនេះបាន។
        </p>
        <p v-else-if="secondsLeft === 0" class="muted">កំពុងពិនិត្យការបង់ប្រាក់…</p>
        <p class="bill">លេខវិក្កយបត្រ {{ order.billNumber }}</p>
      </template>

      <template v-else-if="order.status === 'PAID'">
        <p class="done"><AppIcon name="check" :size="22" /> បង់ប្រាក់រួចរាល់</p>
      </template>

      <template v-else>
        <p class="muted">{{ order.status === 'EXPIRED' ? 'KHQR ផុតពេលហើយ' : 'ការបញ្ជាទិញត្រូវបានបោះបង់' }}</p>
        <button type="button" class="btn btn-primary" @click="start">បង្កើត KHQR ថ្មី</button>
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
</style>
