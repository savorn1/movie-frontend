<script setup lang="ts">
definePageMeta({ layout: 'admin' })
usePageMeta({ title: 'Admin', noindex: true })

const admin = useState('admin-logged-in', () => false)
const route = useRoute()
const router = useRouter()

// Session state lives in an HTTP-only cookie, so ask the server (browser only)
const { data: me, status, refresh } = useFetch('/api/admin/me', { server: false })
watch(me, v => (admin.value = !!v?.admin), { immediate: true })

const password = ref('')
const loginError = ref('')
const loggingIn = ref(false)

async function login() {
  loginError.value = ''
  loggingIn.value = true
  try {
    await $fetch('/api/admin/login', { method: 'POST', body: { password: password.value } })
    password.value = ''
    await refresh()
  } catch (err) {
    const code = (err as { statusCode?: number }).statusCode
    loginError.value = code === 429
      ? 'ព្យាយាមច្រើនដងពេក។ សូមរង់ចាំ ១៥ នាទី។'
      : 'ពាក្យសម្ងាត់មិនត្រឹមត្រូវ។'
  } finally {
    loggingIn.value = false
  }
}

watch(admin, (v) => {
  if (!v && me.value?.admin) refresh()
})

const tabs = [
  { key: 'series', label: 'រឿង' },
  { key: 'insights', label: 'ការយល់ដឹង' },
  { key: 'reports', label: 'របាយការណ៍' }
] as const
type Tab = (typeof tabs)[number]['key']
const tab = computed<Tab>(() => (tabs.some(t => t.key === route.query.tab) ? route.query.tab as Tab : 'series'))
const setTab = (t: Tab) => router.replace({ query: { ...route.query, tab: t === 'series' ? undefined : t } })
</script>

<template>
  <div>
    <p v-if="status === 'pending' || status === 'idle'" class="muted">កំពុងផ្ទុក…</p>

    <!-- Not set up on this server -->
    <section v-else-if="me && !me.configured" class="panel narrow">
      <h1>Admin មិនទាន់កំណត់</h1>
      <p>Set these environment variables on the server, then restart:</p>
      <pre>NUXT_ADMIN_PASSWORD=&lt;a strong password&gt;
NUXT_SESSION_SECRET=&lt;32+ random characters&gt;</pre>
    </section>

    <!-- Login -->
    <form v-else-if="!admin" class="panel narrow" @submit.prevent="login">
      <h1>ចូល Admin</h1>
      <label class="field">
        <span>ពាក្យសម្ងាត់</span>
        <input
          v-model="password"
          type="password"
          autocomplete="current-password"
          required
          :aria-invalid="!!loginError"
          aria-describedby="login-error"
        >
      </label>
      <p v-if="loginError" id="login-error" class="error" role="alert">{{ loginError }}</p>
      <button type="submit" class="btn btn-primary" :disabled="loggingIn || !password">ចូល</button>
    </form>

    <!-- Dashboard -->
    <template v-else>
      <div class="tabs" role="tablist" aria-label="Admin">
        <button
          v-for="t in tabs"
          :key="t.key"
          type="button"
          role="tab"
          :aria-selected="tab === t.key"
          @click="setTab(t.key)"
        >
          {{ t.label }}
        </button>
      </div>
      <AdminSeriesTab v-if="tab === 'series'" />
      <AdminInsightsTab v-else-if="tab === 'insights'" />
      <AdminReportsTab v-else />
    </template>
  </div>
</template>

<style scoped>
.muted {
  color: var(--text-muted);
}

.panel {
  padding: 24px;
  border-radius: 16px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
}

.narrow {
  display: grid;
  gap: 14px;
  max-width: 420px;
  margin: 40px auto;
}

h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 22px;
}

pre {
  margin: 0;
  padding: 12px;
  overflow-x: auto;
  border-radius: 10px;
  background: var(--bg-elev-2);
  font-size: 13px;
}

.field {
  display: grid;
  gap: 6px;
}

.field input {
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
}

.error {
  margin: 0;
  color: #ff6b6b;
}

:root[data-theme='light'] .error {
  color: #c40014;
}

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  padding: 4px;
  width: fit-content;
  border-radius: 999px;
  background: var(--bg-elev-2);
}

.tabs button {
  min-height: 38px;
  padding: 0 18px;
  border-radius: 999px;
  color: var(--text-muted);
  font-weight: 600;
}

.tabs button[aria-selected='true'] {
  background: var(--bg-elev);
  color: var(--text-strong);
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
}
</style>
