<script setup lang="ts">
import type { NuxtError } from '#app'

// Shown for any page that can't be rendered: a missing series or episode (404), or something broken.
// Keeps the site's header and menus so viewers can carry on instead of hitting a dead end.
const props = defineProps<{ error: NuxtError }>()

const notFound = computed(() => props.error.statusCode === 404)
const title = computed(() => (notFound.value ? 'រកមិនឃើញទំព័រនេះទេ' : 'មានបញ្ហាបន្តិចបន្តួច'))
const detail = computed(() =>
  notFound.value
    ? 'រឿង ឬវគ្គនេះប្រហែលជាត្រូវបានដកចេញ ឬតំណភ្ជាប់មិនត្រឹមត្រូវ។'
    : 'យើងមិនអាចបង្ហាញទំព័រនេះបានទេពេលនេះ។ សូមព្យាយាមម្តងទៀតក្នុងពេលបន្តិចទៀត។'
)

useHead({ title: () => `${title.value} · RuengFlix` })

const home = () => clearError({ redirect: '/' })
const retry = () => clearError({ redirect: useRoute().fullPath })
</script>

<template>
  <NuxtLayout>
    <div class="error-page" role="alert">
      <span class="code display" aria-hidden="true">{{ error.statusCode || 500 }}</span>
      <h1>{{ title }}</h1>
      <p>{{ detail }}</p>
      <div class="acts">
        <button type="button" class="btn btn-primary" @click="home">ទៅទំព័រដើម</button>
        <button v-if="!notFound" type="button" class="btn btn-outline" @click="retry">ព្យាយាមម្តងទៀត</button>
        <NuxtLink v-else to="/browse" class="btn btn-outline" @click.prevent="clearError({ redirect: '/browse' })">រុករករឿង</NuxtLink>
      </div>
    </div>
  </NuxtLayout>
</template>

<style scoped>
.error-page {
  display: grid;
  justify-items: center;
  gap: 12px;
  max-width: 520px;
  margin: 0 auto;
  padding: 96px 16px 64px;
  text-align: center;
}

.code {
  color: var(--accent-text);
  font-size: 88px;
  line-height: 1;
}

h1 {
  margin: 0;
  color: var(--text-strong);
  font-size: 24px;
}

p {
  margin: 0;
  color: var(--text-muted);
}

.acts {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 10px;
  margin-top: 8px;
}
</style>
