<script setup lang="ts">
import type { Movie } from '#shared/data/movies'

const props = defineProps<{ movie: Movie }>()

const { isFollowing, toggleFollow } = useLibrary()
const { viewer } = useViewer()
const push = usePush()
const { show } = useToast()
const bot = useRuntimeConfig().public.telegramBot as string

const following = computed(() => isFollowing(props.movie.id))
/** Signed in with Telegram on the account: alerts go straight to their chat */
const accountAlerts = computed(() => !!viewer.value?.telegram)

/** Turn the account's Telegram alerts on or off; false when that didn't work */
async function setAccountAlerts(id: number, on: boolean) {
  try {
    await $fetch(`/api/follows/${id}`, { method: on ? 'POST' : 'DELETE' })
    return true
  } catch {
    return false
  }
}

// Following shows the series' new episodes on the Me page. Alerts, best first: Telegram on the account
// (straight to their chat); this browser's notifications (Web Push, for remote series); or opening the
// bot with a deep link (/start s<id>), which stores the chat.
async function onClick() {
  const id = props.movie.id
  toggleFollow(id)
  if (following.value) {
    if (accountAlerts.value) {
      show((await setAccountAlerts(id, true))
        ? 'បានតាមដាន · យើងនឹងផ្ញើដំណឹងវគ្គថ្មីទៅ Telegram របស់អ្នក'
        : 'បានតាមដាន · មិនអាចបើកដំណឹង Telegram បានទេពេលនេះ')
    } else if (props.movie.remote && push.supported() && (await push.setFollow(id, true))) {
      show('បានតាមដាន · យើងនឹងជូនដំណឹងនៅលើឧបករណ៍នេះពេលមានវគ្គថ្មី')
    } else if (bot) {
      window.open(`https://t.me/${bot}?start=s${id}`, '_blank', 'noopener')
      show('បើក Telegram ហើយចុច Start ដើម្បីទទួលដំណឹងវគ្គថ្មី')
    } else {
      show('បានតាមដាន។ យើងនឹងបង្ហាញវគ្គថ្មីនៅក្នុង “ខ្ញុំ”។')
    }
  } else {
    if (accountAlerts.value) await setAccountAlerts(id, false)
    if (props.movie.remote && push.supported()) push.setFollow(id, false)
    const message = accountAlerts.value
      ? 'បានឈប់តាមដាន និងឈប់ផ្ញើដំណឹង Telegram'
      : bot
        ? 'បានឈប់តាមដាន។ ផ្ញើ /stop ទៅ bot ដើម្បីឈប់ទទួលសារ Telegram។'
        : 'បានឈប់តាមដាន'
    show(message, {
      label: 'មិនធ្វើវិញ',
      run: () => {
        toggleFollow(id)
        if (accountAlerts.value) setAccountAlerts(id, true)
      }
    })
  }
}
</script>

<template>
  <ActionButton
    :icon="following ? 'check' : 'bell'"
    :label="following ? 'កំពុងតាមដាន' : 'តាមដាន'"
    :pressed="following"
    :title="bot ? 'ទទួលដំណឹងតាម Telegram ពេលមានវគ្គថ្មី' : undefined"
    @click="onClick"
  />
</template>
