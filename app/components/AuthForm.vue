<script setup lang="ts">
// Sign in or create an account with a Cambodian phone number and a password (/login, /register).
const props = defineProps<{ mode: 'login' | 'register' }>()

const route = useRoute()
const { login, register, enabled, known } = useViewer()
const { show } = useToast()

const phone = ref('')
const password = ref('')
const displayName = ref('')
const showPassword = ref(false)
const busy = ref(false)
const error = ref('')

// Back to where they were, but only to a page on this site
const next = computed(() => {
  const n = route.query.next
  return typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') ? n : '/library'
})
const otherLink = computed(() => ({
  path: props.mode === 'login' ? '/register' : '/login',
  query: route.query.next ? { next: route.query.next } : {}
}))

async function submit() {
  error.value = ''
  if (props.mode === 'register' && password.value.length < 8) {
    error.value = 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៨ តួ'
    return
  }
  busy.value = true
  try {
    if (props.mode === 'login') {
      await login(phone.value, password.value)
      show('បានចូលគណនី')
    } else {
      await register(phone.value, password.value, displayName.value)
      show('បានបង្កើតគណនី · ប្រវត្តិមើលរបស់អ្នកនឹងរក្សាទុកក្នុងគណនី')
    }
    await navigateTo(next.value, { replace: true })
  } catch (err) {
    error.value = accountError(err)
    password.value = ''
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="auth">
    <form class="card" novalidate @submit.prevent="submit">
      <h1>{{ mode === 'login' ? 'ចូលគណនី' : 'បង្កើតគណនី' }}</h1>
      <p class="lead">
        {{
          mode === 'login'
            ? 'ចូលគណនី ដើម្បីមើលបន្តលើគ្រប់ឧបករណ៍។'
            : 'រក្សាទុករឿងដែលចូលចិត្ត ប្រវត្តិមើល និងរឿងដែលបានដោះសោ ក្នុងគណនីរបស់អ្នក។'
        }}
      </p>

      <p v-if="known && !enabled" class="error" role="alert">មិនទាន់អាចប្រើគណនីបាននៅឡើយទេ</p>

      <label v-if="mode === 'register'" class="field">
        <span>ឈ្មោះ</span>
        <input v-model="displayName" name="name" autocomplete="nickname" maxlength="60" required>
      </label>

      <label class="field">
        <span>លេខទូរស័ព្ទ</span>
        <input
          v-model="phone"
          name="phone"
          type="tel"
          inputmode="tel"
          autocomplete="tel"
          placeholder="012 345 678"
          maxlength="20"
          required
          :aria-invalid="!!error"
          aria-describedby="auth-error"
        >
      </label>

      <label class="field">
        <span>ពាក្យសម្ងាត់</span>
        <span class="pw">
          <input
            v-model="password"
            name="password"
            :type="showPassword ? 'text' : 'password'"
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            :minlength="mode === 'register' ? 8 : undefined"
            maxlength="128"
            required
            :aria-invalid="!!error"
            aria-describedby="auth-error"
          >
          <button type="button" class="reveal" :aria-pressed="showPassword" @click="showPassword = !showPassword">
            {{ showPassword ? 'លាក់' : 'បង្ហាញ' }}
          </button>
        </span>
        <small v-if="mode === 'register'">យ៉ាងហោចណាស់ ៨ តួ</small>
      </label>

      <p v-if="error" id="auth-error" class="error" role="alert">{{ error }}</p>

      <button type="submit" class="btn btn-primary submit" :disabled="busy || (known && !enabled)">
        {{ busy ? 'សូមរង់ចាំ…' : mode === 'login' ? 'ចូលគណនី' : 'បង្កើតគណនី' }}
      </button>

      <p class="switch">
        <template v-if="mode === 'login'">មិនទាន់មានគណនី? </template>
        <template v-else>មានគណនីរួចហើយ? </template>
        <NuxtLink :to="otherLink">{{ mode === 'login' ? 'បង្កើតគណនី' : 'ចូលគណនី' }}</NuxtLink>
      </p>
    </form>
  </div>
</template>

<style scoped>
.auth {
  display: grid;
  place-items: start center;
  padding: 96px 16px 48px;
  min-height: 70vh;
}

.card {
  display: grid;
  gap: 16px;
  width: 100%;
  max-width: 400px;
  padding: 28px 24px;
  border: 1px solid var(--border);
  border-radius: 16px;
  background: var(--bg-elev);
}

h1 {
  margin: 0;
  font-size: 24px;
  color: var(--text-strong);
}

.lead {
  margin: -8px 0 0;
  color: var(--text-muted);
}

.field {
  display: grid;
  gap: 6px;
  color: var(--text-strong);
}

.field small {
  color: var(--text-muted);
}

.field input {
  width: 100%;
  min-height: 48px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  font-size: 16px;
}

.field input:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 1px;
}

.pw {
  position: relative;
  display: block;
}

.pw input {
  padding-right: 72px;
}

.reveal {
  position: absolute;
  top: 0;
  right: 0;
  height: 100%;
  min-width: 64px;
  padding: 0 12px;
  border: 0;
  background: none;
  color: var(--text);
  font: inherit;
  cursor: pointer;
}

.error {
  margin: 0;
  color: #ff6b6b;
}

.submit {
  min-height: 48px;
  justify-content: center;
}

.switch {
  margin: 0;
  text-align: center;
}

.switch a {
  color: var(--accent);
  font-weight: 600;
}
</style>
