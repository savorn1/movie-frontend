<script setup lang="ts">
/*
 * Banners for the signed-in viewer, under the header on every page:
 *  - a payment that went through after they closed the KHQR screen ("+150 coins · Back to episode 7")
 *  - VIP ending within 3 days, with a one-tap Renew (dismissed for the day)
 */
interface PaidOrder {
  id: number
  kind: 'COINS' | 'SERIES' | 'VIP'
  coins: number | null
  bonusCoins: number | null
  months: number | null
  seriesId: number | null
  seriesTitle: string | null
  promoCoins?: number | null
  /** Bought for a friend: the notice points at the link to send, not at coins they got */
  gift?: boolean
}

const { viewer } = useViewer()
const { wallet, refresh: refreshWallet } = useWallet()
const route = useRoute()
const news = ref<PaidOrder[]>([])
const vipDismissedOn = ref<string | null>(null)
const today = () => new Date().toDateString()

async function loadNews() {
  if (!viewer.value) {
    news.value = []
    return
  }
  try {
    news.value = await $fetch<PaidOrder[]>('/api/orders/news')
    if (news.value.length) {
      haptic('success')
      await refreshWallet()
    }
  } catch {
    // A hint only
  }
}

onMounted(() => {
  try {
    vipDismissedOn.value = localStorage.getItem('rf-vip-reminder-dismissed')
  } catch {
    // Storage blocked: the banner shows each visit
  }
  loadNews()
})
watch(() => viewer.value?.id, loadNews)
// Coming back to the tab after paying in the banking app
const onVisible = () => document.visibilityState === 'visible' && loadNews()
onMounted(() => document.addEventListener('visibilitychange', onVisible))
onBeforeUnmount(() => document.removeEventListener('visibilitychange', onVisible))

const first = computed(() => news.value[0] ?? null)
const what = (o: PaidOrder) =>
  o.gift
    ? '🎁 កាដូរួចរាល់ · ផ្ញើតំណទៅមិត្ត'
    : o.kind === 'COINS'
    ? `+${kh((o.coins ?? 0) + (o.bonusCoins ?? 0) + (o.promoCoins ?? 0))} កាក់`
    : o.kind === 'VIP'
      ? `VIP ${kh(o.months ?? 0)} ខែ`
      : `“${o.seriesTitle ?? ''}” បានដោះសោ`
const back = computed(() => (first.value ? orderReturn(first.value.id) : null))

async function dismiss(o: PaidOrder) {
  news.value = news.value.filter(x => x.id !== o.id)
  forgetOrderReturn(o.id)
  await $fetch(`/api/orders/${o.id}/seen`, { method: 'POST' }).catch(() => {})
}

async function goBack(o: PaidOrder) {
  const to = o.gift ? '/library#gifts' : (orderReturn(o.id) ?? (o.seriesId ? `/detail/${o.seriesId}` : '/library#wallet'))
  await dismiss(o)
  await navigateTo(to)
}

// VIP ending soon
const vipDaysLeft = computed(() => {
  const w = wallet.value
  if (!w?.vipActive || !w.vipUntil) return null
  const days = Math.ceil((Date.parse(w.vipUntil) - Date.now()) / 86_400_000)
  return days <= 3 ? Math.max(1, days) : null
})
const showVip = computed(() => vipDaysLeft.value !== null && vipDismissedOn.value !== today() && route.path !== '/vip')
function dismissVip() {
  vipDismissedOn.value = today()
  try {
    localStorage.setItem('rf-vip-reminder-dismissed', today())
  } catch {
    // Fine: hidden for this visit
  }
}
</script>

<template>
  <div v-if="first || showVip" class="notices">
    <div v-if="first" class="notice paid" role="status">
      <AppIcon name="check" :size="20" class="icon" />
      <p>
        <strong>ការបង់ប្រាក់បានជោគជ័យ</strong> · {{ what(first) }}
        <span v-if="news.length > 1" class="more">និង {{ kh(news.length - 1) }} ទៀត</span>
      </p>
      <button type="button" class="btn btn-primary" @click="goBack(first)">
        {{ back?.startsWith('/watch/') ? 'ត្រឡប់ទៅមើល' : 'មើល' }}
      </button>
      <button type="button" class="x" aria-label="បិទ" @click="dismiss(first)"><AppIcon name="close" :size="18" /></button>
    </div>
    <div v-else-if="showVip" class="notice vip" role="status">
      <AppIcon name="crown" :size="20" class="icon" />
      <p><strong>VIP ជិតផុតហើយ</strong> · នៅសល់ {{ kh(vipDaysLeft!) }} ថ្ងៃ</p>
      <NuxtLink to="/vip" class="btn btn-primary" @click="dismissVip">បន្ត VIP</NuxtLink>
      <button type="button" class="x" aria-label="បិទ" @click="dismissVip"><AppIcon name="close" :size="18" /></button>
    </div>
  </div>
</template>

<style scoped>
/* Floats just under the header, so pages that slide under it (the home banner) can't cover it */
.notices {
  position: fixed;
  top: 72px;
  left: 50%;
  z-index: 45;
  width: min(640px, calc(100% - 32px));
  transform: translateX(-50%);
}

.notice {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 8px 8px 14px;
  border-radius: 14px;
  border: 1px solid var(--border);
  background: var(--bg-elev);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.35);
}

.notice.paid {
  border-color: rgba(47, 191, 113, 0.5);
}

.notice.vip {
  border-color: rgba(255, 184, 0, 0.6);
}

.icon {
  flex: none;
}

.paid .icon {
  color: #2fbf71;
}

.vip .icon {
  color: #ffb800;
}

p {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 14px;
}

strong {
  color: var(--text-strong);
}

.more {
  color: var(--text-muted);
}

.btn {
  flex: none;
  min-height: 40px;
}

.x {
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 10px;
  color: var(--text-muted);
}

@media (max-width: 768px) {
  .notices {
    top: 64px;
  }

  .notice {
    flex-wrap: wrap;
  }

  p {
    flex-basis: calc(100% - 80px);
  }
}
</style>
