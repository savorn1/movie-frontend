<script setup lang="ts">
// The Me page's account section: sign in / create an account, or who is signed in and how, with
// "add Telegram / Google", "change password" (or set a new one right after signing in with Telegram or
// Google: "forgot password"), "log out" and "delete account". Hidden while accounts aren't available.
const { viewer, enabled, known, methods, logout, changePassword, deleteAccount } = useViewer()

const deleting = ref(false)
const confirmText = ref('')
const DELETE_WORD = 'លុប'

async function onDelete() {
  busy.value = true
  try {
    await deleteAccount()
    show('បានលុបគណនីរបស់អ្នកហើយ')
    deleting.value = false
  } catch (err) {
    error.value = accountError(err)
  } finally {
    busy.value = false
  }
}

const route = useRoute()
const linkError = ref(route.query.error ? accountErrorFromCode(route.query.error) : '')
/** Ways in this account doesn't have yet, that the server offers */
const canAdd = computed(() => {
  const v = viewer.value
  const out: Array<'telegram' | 'google'> = []
  if (v && !v.telegram && methods.value.telegram) out.push('telegram')
  if (v && !v.google && methods.value.google) out.push('google')
  return out
})
const signInWays = computed(() => {
  const v = viewer.value
  if (!v) return ''
  return [v.phone, v.telegram && (v.telegram.username ? `Telegram @${v.telegram.username}` : 'Telegram'), v.google?.email]
    .filter(Boolean)
    .join(' · ')
})

function onLinked() {
  linkError.value = ''
  show('បានភ្ជាប់ Telegram · ដំណឹងវគ្គថ្មីនឹងផ្ញើទៅ Telegram របស់អ្នក')
}
const { show } = useToast()

const changing = ref(false)
const current = ref('')
const next = ref('')
const busy = ref(false)
const error = ref('')

const resetting = computed(() => !!viewer.value?.canResetPassword)
watch(resetting, (r) => r && (changing.value = true), { immediate: true })

async function onChangePassword() {
  error.value = ''
  if (next.value.length < 8) {
    error.value = 'ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងហោចណាស់ ៨ តួ'
    return
  }
  busy.value = true
  try {
    await changePassword(resetting.value ? null : current.value, next.value)
    show('បានប្ដូរពាក្យសម្ងាត់ · ឧបករណ៍ផ្សេងទៀតត្រូវចូលគណនីម្តងទៀត')
    changing.value = false
    current.value = ''
    next.value = ''
  } catch (err) {
    error.value = accountError(err)
  } finally {
    busy.value = false
  }
}

async function onLogout() {
  await logout()
  show('បានចាកចេញ · ប្រវត្តិមើលនៅតែរក្សាទុកក្នុងគណនី')
}
</script>

<template>
  <section v-if="known && enabled" class="account" aria-labelledby="account-title">
    <div class="head">
      <h2 id="account-title">គណនី</h2>
    </div>

    <template v-if="viewer">
      <div class="row">
        <img v-if="viewer.photoUrl" :src="viewer.photoUrl" alt="" class="avatar" width="48" height="48" referrerpolicy="no-referrer">
        <div class="who">
          <strong>{{ viewer.displayName }}</strong>
          <span>{{ signInWays }}</span>
          <span>ប្រវត្តិមើល និងរឿងដែលរក្សាទុក ត្រូវបានរក្សាទុកក្នុងគណនី</span>
        </div>
        <div class="actions">
          <button v-if="viewer.hasPassword" type="button" class="btn btn-outline" :aria-expanded="changing" @click="changing = !changing">
            ប្ដូរពាក្យសម្ងាត់
          </button>
          <button type="button" class="btn btn-outline" @click="onLogout">ចាកចេញ</button>
        </div>
      </div>

      <form v-if="changing" class="pw-form" @submit.prevent="onChangePassword">
        <p v-if="resetting" class="hint">អ្នកទើបចូលតាម Telegram ឬ Google ដូច្នេះអាចកំណត់ពាក្យសម្ងាត់ថ្មីបានដោយមិនចាំបាច់ពាក្យចាស់។</p>
        <label v-if="!resetting" class="field">
          <span>ពាក្យសម្ងាត់បច្ចុប្បន្ន</span>
          <input v-model="current" type="password" autocomplete="current-password" maxlength="128" required>
        </label>
        <label class="field">
          <span>ពាក្យសម្ងាត់ថ្មី</span>
          <input v-model="next" type="password" autocomplete="new-password" minlength="8" maxlength="128" required>
        </label>
        <p v-if="error" class="error" role="alert">{{ error }}</p>
        <button type="submit" class="btn btn-primary" :disabled="busy">{{ busy ? 'សូមរង់ចាំ…' : 'រក្សាទុក' }}</button>
      </form>

      <details class="danger" :open="deleting" @toggle="deleting = ($event.target as HTMLDetailsElement).open">
        <summary>លុបគណនី</summary>
        <p>ការលុបមិនអាចត្រឡប់វិញបានទេ៖ ប្រវត្តិមើល កាក់ VIP រឿងដែលបានដោះសោ និងមតិរបស់អ្នកនឹងត្រូវលុបទាំងអស់។</p>
        <label class="field">
          <span>វាយពាក្យ “{{ DELETE_WORD }}” ដើម្បីបញ្ជាក់</span>
          <input v-model="confirmText" autocomplete="off">
        </label>
        <button type="button" class="btn btn-danger" :disabled="busy || confirmText.trim() !== DELETE_WORD" @click="onDelete">លុបគណនីជាអចិន្ត្រៃយ៍</button>
      </details>

      <div v-if="canAdd.length" class="add">
        <p>ភ្ជាប់ {{ canAdd.map(m => (m === 'telegram' ? 'Telegram' : 'Google')).join(' ឬ ') }} ដើម្បីចូលគណនីបានលឿន{{ canAdd.includes('telegram') ? ' និងទទួលដំណឹងវគ្គថ្មីតាម Telegram' : '' }}។</p>
        <SignInButtons link next="/library" :only="canAdd" @done="onLinked" @error="linkError = $event" />
      </div>
      <p v-if="linkError" class="error" role="alert">{{ linkError }}</p>
    </template>

    <div v-else class="row">
      <p class="who">
        <span>ចូលគណនី ដើម្បីរក្សាទុករឿងដែលចូលចិត្ត ប្រវត្តិមើល និងរឿងដែលបានដោះសោ ហើយមើលបន្តលើទូរស័ព្ទ ឬកុំព្យូទ័រផ្សេងទៀត។</span>
      </p>
      <div class="actions">
        <NuxtLink to="/login?next=/library" class="btn btn-primary">ចូលគណនី</NuxtLink>
        <NuxtLink to="/register?next=/library" class="btn btn-outline">បង្កើតគណនី</NuxtLink>
      </div>
    </div>
  </section>
</template>

<style scoped>
.account {
  display: grid;
  gap: 12px;
}

.head h2 {
  margin: 0;
}

.row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
}

.who {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 200px;
  margin: 0;
}

.who strong {
  color: var(--text-strong);
  font-size: 18px;
}

.who span {
  color: var(--text-muted);
  font-size: 14px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.hint {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
}

.danger {
  display: grid;
  gap: 10px;
  max-width: 420px;
}

.danger summary {
  color: var(--text-muted);
  cursor: pointer;
}

.danger[open] {
  padding: 12px;
  border: 1px solid #ff6b6b66;
  border-radius: 12px;
}

.danger p {
  margin: 8px 0;
  font-size: 14px;
}

.btn-danger {
  justify-content: center;
  margin-top: 8px;
  border: 0;
  background: #d93838;
  color: #fff;
}

.btn-danger:disabled {
  opacity: 0.5;
}

.add {
  display: grid;
  gap: 10px;
  max-width: 360px;
}

.add p {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.pw-form {
  display: grid;
  gap: 12px;
  max-width: 360px;
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
  font-size: 16px;
}

.error {
  margin: 0;
  color: #ff6b6b;
}
</style>
