<script setup lang="ts">
const { info, detect, chromeIntent } = useInAppBrowser()
const { show } = useToast()
const hydrated = useHydrated()

const KEY = 'ruengflix-inapp-dismissed'
const dismissed = ref(true)

onMounted(() => {
  detect()
  try {
    dismissed.value = sessionStorage.getItem(KEY) === '1'
  } catch {
    dismissed.value = false
  }
})

function dismiss() {
  dismissed.value = true
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {}
}

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
    show('បានចម្លងតំណ។ បិទភ្ជាប់ក្នុង Safari ឬ Chrome។')
  } catch {
    show('ចុច ⋯ ឬ ⋮ ហើយជ្រើស “Open in browser”')
  }
}
</script>

<template>
  <div v-if="hydrated && info.app && !dismissed" class="inapp" role="region" aria-label="ការណែនាំកម្មវិធីរុករក">
    <AppIcon name="expand" :size="20" class="lead" />
    <p>
      អ្នកកំពុងបើកក្នុង {{ info.app }}។ សម្រាប់វីដេអូពេញអេក្រង់ និងការចាក់រលូនជាងនេះ
      <template v-if="info.ios">ចុច <b>⋯</b> ហើយជ្រើស <b>Open in Safari</b>។</template>
      <template v-else>សូមបើកក្នុង Chrome។</template>
    </p>
    <div class="actions">
      <a v-if="info.android" :href="chromeIntent()" class="btn btn-primary">បើកក្នុង Chrome</a>
      <button v-else type="button" class="btn btn-outline" @click="copyLink">ចម្លងតំណ</button>
      <button type="button" class="close" aria-label="បិទ" @click="dismiss">
        <AppIcon name="close" :size="18" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.inapp {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 12px;
  margin: 12px 32px 0;
  padding: 12px 12px 12px 16px;
  border-radius: 14px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
}

.lead {
  flex-shrink: 0;
  color: var(--text-muted);
}

p {
  flex: 1;
  min-width: 200px;
  margin: 0;
  font-size: 14px;
}

.actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.close {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  color: var(--text-muted);
}

.close:hover {
  background: var(--bg-hover);
}

@media (max-width: 768px) {
  .inapp {
    margin: 12px 16px 0;
  }
}
</style>
