<script setup lang="ts">
import type { Movie } from '#shared/data/movies'

const props = defineProps<{ movie: Movie }>()

const { isFollowing, toggleFollow } = useLibrary()
const { show } = useToast()
const bot = useRuntimeConfig().public.telegramBot as string

const following = computed(() => isFollowing(props.movie.id))

// Following opens the Telegram bot with a deep link (/start s<id>); the bot stores the chat
// and messages it when a new episode is published.
function onClick() {
  const id = props.movie.id
  toggleFollow(id)
  if (following.value) {
    if (bot) {
      window.open(`https://t.me/${bot}?start=s${id}`, '_blank', 'noopener')
      show('បើក Telegram ហើយចុច Start ដើម្បីទទួលដំណឹងវគ្គថ្មី')
    } else {
      show('បានតាមដាន។ យើងនឹងបង្ហាញវគ្គថ្មីនៅក្នុង “ខ្ញុំ”។')
    }
  } else {
    show(bot ? 'បានឈប់តាមដាន។ ផ្ញើ /stop ទៅ bot ដើម្បីឈប់ទទួលសារ Telegram។' : 'បានឈប់តាមដាន', {
      label: 'មិនធ្វើវិញ',
      run: () => toggleFollow(id)
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
