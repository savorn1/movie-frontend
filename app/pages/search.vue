<script setup lang="ts">

const route = useRoute()
const term = computed(() => String(route.query.wd ?? '').trim())
const { search } = useCatalog()
const results = computed(() => search(term.value))

usePageMeta(() => ({ title: term.value ? `ស្វែងរក “${term.value}”` : 'ស្វែងរក', noindex: true }))
</script>

<template>
  <div class="page">
    <!-- Phones reach search from the tab bar; the header field is hidden there -->
    <div class="page-search" :class="{ always: !term }">
      <SearchBox :key="term" :initial="term" :autofocus="!term" />
    </div>

    <template v-if="term">
      <MovieRow v-if="results.length" :title="`លទ្ធផលសម្រាប់ “${term}” (${kh(results.length)})`" :items="results" />
      <EmptyState v-else icon="search" :message="`រកមិនឃើញ “${term}”។ សាកល្បងពាក្យខ្លីជាងនេះ ឬប្រភេទរឿងដូចជា “ស្នេហា”។`">
        <NuxtLink to="/hot" class="btn btn-outline">មើលរឿងពេញនិយម</NuxtLink>
      </EmptyState>
    </template>
  </div>
</template>

<style scoped>
.page-search {
  display: none;
  max-width: 560px;
  margin-bottom: 24px;
}

/* With no query yet, desktop shows the field too so the page isn't blank */
.page-search.always {
  display: block;
}

@media (max-width: 768px) {
  .page-search {
    display: block;
  }
}
</style>
