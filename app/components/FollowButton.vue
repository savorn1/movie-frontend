<script setup lang="ts">
import type { Movie } from '#shared/data/movies'

const props = defineProps<{ movie: Movie; compact?: boolean }>()

const { isFollowing, toggle, botName } = useFollowSeries()
const following = computed(() => isFollowing(props.movie.id))
</script>

<template>
  <ActionButton
    :icon="following ? 'check' : 'bell'"
    :label="following ? 'កំពុងតាមដាន' : compact ? 'ជូនដំណឹង' : 'តាមដាន'"
    :pressed="following"
    :title="botName ? 'ទទួលដំណឹងតាម Telegram ពេលមានវគ្គថ្មី' : undefined"
    @click="toggle(movie)"
  />
</template>
