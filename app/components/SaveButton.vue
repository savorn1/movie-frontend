<script setup lang="ts">
defineProps<{ movieId: number }>()

const { isSaved, toggleSave } = useSaveToggle()
</script>

<template>
  <ActionButton
    icon="heart"
    tone="love"
    :label="isSaved(movieId) ? 'បានរក្សា' : 'រក្សាទុក'"
    :pressed="isSaved(movieId)"
    @click="toggleSave(movieId)"
  />
</template>
