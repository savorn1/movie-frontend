<script setup lang="ts">
// "Report a problem" from the player; goes to /admin and the admin Telegram chat
const props = defineProps<{ seriesId: number; ep: number; time: number }>()
const emit = defineEmits<{ close: [] }>()

const reasons = [
  { value: 'video', label: 'វីដេអូមិនដើរ ឬគាំង' },
  { value: 'subtitles', label: 'អក្សររត់ខុស ឬបាត់' },
  { value: 'audio', label: 'សំឡេងមានបញ្ហា' },
  { value: 'other', label: 'ផ្សេងៗ' }
]

const { show } = useToast()
const dialog = ref<HTMLDialogElement>()
const reason = ref('video')
const note = ref('')
const sending = ref(false)
const error = ref('')

onMounted(() => dialog.value?.showModal())

async function send() {
  sending.value = true
  error.value = ''
  try {
    await $fetch('/api/reports', {
      method: 'POST',
      body: { seriesId: props.seriesId, ep: props.ep, reason: reason.value, note: note.value, time: Math.floor(props.time) }
    })
    show('អរគុណ! យើងនឹងពិនិត្យបញ្ហានេះ។')
    dialog.value?.close()
  } catch (err) {
    error.value = (err as { statusCode?: number }).statusCode === 429
      ? 'អ្នកបានរាយការណ៍ច្រើនដងពេក។ សូមព្យាយាមម្តងទៀតពេលក្រោយ។'
      : 'មិនអាចផ្ញើបានទេ។ សូមព្យាយាមម្តងទៀត។'
  } finally {
    sending.value = false
  }
}
</script>

<template>
  <dialog ref="dialog" class="dialog" aria-labelledby="report-title" @close="emit('close')" @click.self="dialog?.close()">
    <form class="form" @submit.prevent="send">
      <h2 id="report-title">រាយការណ៍បញ្ហា</h2>
      <fieldset>
        <legend class="sr-only">បញ្ហា</legend>
        <label v-for="r in reasons" :key="r.value" class="option">
          <input v-model="reason" type="radio" name="reason" :value="r.value">
          <span>{{ r.label }}</span>
        </label>
      </fieldset>
      <label class="field">
        <span>ព័ត៌មានបន្ថែម <small>(មិនចាំបាច់)</small></span>
        <textarea v-model="note" rows="2" maxlength="300" />
      </label>
      <p v-if="error" class="error" role="alert">{{ error }}</p>
      <div class="buttons">
        <button type="button" class="btn btn-outline" @click="dialog?.close()">បោះបង់</button>
        <button type="submit" class="btn btn-primary" :disabled="sending">ផ្ញើ</button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.dialog {
  width: min(420px, calc(100% - 24px));
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 18px;
  background: var(--bg-elev);
  color: var(--text);
}

.dialog::backdrop {
  background: rgba(0, 0, 0, 0.6);
}

.form {
  display: grid;
  gap: 12px;
  padding: 22px;
}

h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 19px;
}

fieldset {
  display: grid;
  gap: 4px;
  margin: 0;
  padding: 0;
  border: 0;
}

.option {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  padding: 0 12px;
  border-radius: 10px;
  cursor: pointer;
}

.option:hover {
  background: var(--bg-hover);
}

.option input {
  width: 18px;
  height: 18px;
}

.field {
  display: grid;
  gap: 6px;
  font-size: 14px;
}

.field small {
  color: var(--text-muted);
}

.field textarea {
  padding: 8px 12px;
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

.buttons {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
</style>
