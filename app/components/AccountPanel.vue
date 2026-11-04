<script setup lang="ts">
// The Me page's account section: sign in / create an account, or who is signed in, with
// "change password" and "log out". Hidden while accounts aren't available on this server.
const { viewer, enabled, known, logout, changePassword } = useViewer()
const { show } = useToast()

const changing = ref(false)
const current = ref('')
const next = ref('')
const busy = ref(false)
const error = ref('')

async function onChangePassword() {
  error.value = ''
  if (next.value.length < 8) {
    error.value = 'ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងហោចណាស់ ៨ តួ'
    return
  }
  busy.value = true
  try {
    await changePassword(current.value, next.value)
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
        <div class="who">
          <strong>{{ viewer.displayName }}</strong>
          <span>{{ viewer.phone }} · ប្រវត្តិមើល និងរឿងដែលរក្សាទុក ត្រូវបានរក្សាទុកក្នុងគណនី</span>
        </div>
        <div class="actions">
          <button type="button" class="btn btn-outline" :aria-expanded="changing" @click="changing = !changing">ប្ដូរពាក្យសម្ងាត់</button>
          <button type="button" class="btn btn-outline" @click="onLogout">ចាកចេញ</button>
        </div>
      </div>

      <form v-if="changing" class="pw-form" @submit.prevent="onChangePassword">
        <label class="field">
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
