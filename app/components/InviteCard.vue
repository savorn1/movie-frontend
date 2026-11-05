<script setup lang="ts">
// Invite a friend: the viewer's link (copy, Telegram, share sheet) and how many friends joined and
// counted. Both sides get coins once the friend has finished a few episodes.
interface Invite {
  code: string
  link: string
  joined: number
  rewarded: number
  coinsEach: number
  watchesNeeded: number
}

const { viewer } = useViewer()
const { success, fail } = useToast()
const invite = ref<Invite | null>(null)

async function load() {
  if (!viewer.value) return
  invite.value = await $fetch<Invite>('/api/invite').catch(() => null)
}
onMounted(load)
watch(() => viewer.value?.id, load)

const message = computed(() => `មកមើលរឿងភាគខ្មែរជាមួយគ្នានៅ RuengFlix! ចុះឈ្មោះតាមតំណនេះ ទទួលបាន ${kh(invite.value?.coinsEach ?? 50)} កាក់ឥតគិតថ្លៃ។`)
const telegramUrl = computed(() =>
  invite.value ? `https://t.me/share/url?url=${encodeURIComponent(invite.value.link)}&text=${encodeURIComponent(message.value)}` : '#'
)

async function copy() {
  if (!invite.value) return
  try {
    await navigator.clipboard.writeText(invite.value.link)
    success('បានចម្លងតំណ')
  } catch {
    fail('មិនអាចចម្លងបានទេ · សូមចម្លងតំណដោយដៃ')
  }
}

async function shareSheet() {
  if (!invite.value) return
  try {
    await navigator.share({ title: 'RuengFlix', text: message.value, url: invite.value.link })
  } catch {
    // Cancelled
  }
}
const canShare = ref(false)
onMounted(() => (canShare.value = typeof navigator.share === 'function'))
</script>

<template>
  <section v-if="viewer && invite" class="invite" aria-labelledby="invite-title">
    <div class="head">
      <span class="gift"><AppIcon name="gift" :size="22" /></span>
      <div>
        <h2 id="invite-title">អញ្ជើញមិត្តភក្តិ · ទទួលបាន {{ kh(invite.coinsEach) }} កាក់ទាំងពីរនាក់</h2>
        <p>ពេលមិត្តភក្តិចុះឈ្មោះតាមតំណរបស់អ្នក ហើយមើល {{ kh(invite.watchesNeeded) }} វគ្គ</p>
      </div>
    </div>
    <div class="link">
      <input :value="invite.link" readonly aria-label="តំណអញ្ជើញរបស់អ្នក" @focus="($event.target as HTMLInputElement).select()">
      <button type="button" class="btn btn-outline" @click="copy">ចម្លង</button>
    </div>
    <div class="acts">
      <a :href="telegramUrl" target="_blank" rel="noopener" class="btn btn-primary"><AppIcon name="telegram" :size="18" /> ផ្ញើតាម Telegram</a>
      <button v-if="canShare" type="button" class="btn btn-outline" @click="shareSheet"><AppIcon name="share" :size="18" /> ចែករំលែក</button>
    </div>
    <p class="stats">
      បានចុះឈ្មោះ <strong>{{ kh(invite.joined) }}</strong> · ទទួលកាក់រួច <strong>{{ kh(invite.rewarded) }}</strong>
    </p>
  </section>
</template>

<style scoped>
.invite {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid rgba(47, 191, 113, 0.45);
  border-radius: 14px;
  background: var(--bg-elev);
}

.head {
  display: flex;
  gap: 12px;
}

.gift {
  display: grid;
  flex: none;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #2fbf71;
  color: #fff;
}

h2 {
  margin: 0;
  font-size: 16px;
  color: var(--text-strong);
}

.head p,
.stats {
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: 13px;
}

.stats strong {
  color: var(--text-strong);
}

.link {
  display: flex;
  gap: 8px;
}

.link input {
  flex: 1;
  min-width: 0;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--bg);
  color: var(--text);
  font: inherit;
  font-size: 14px;
}

.acts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.acts .btn {
  gap: 6px;
  min-height: 44px;
}
</style>
