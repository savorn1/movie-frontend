<script setup lang="ts">
const { find } = useCatalog()

usePageMeta({ title: 'ខ្ញុំ', noindex: true })

const { history, continueWatching, favorites, following, prefs } = useLibrary()
const { reason: saverReason } = useDataSaver()
const { state: installState, install } = useInstallApp()
const hydrated = useHydrated()

async function onInstall() {
  if (await install()) show('បានតំឡើង RuengFlix លើអេក្រង់ដើម')
}
const saverOptions = [
  { value: 'auto' as const, label: 'ស្វ័យប្រវត្តិ', icon: 'monitor' },
  { value: 'on' as const, label: 'បើក', icon: 'check' },
  { value: 'off' as const, label: 'បិទ', icon: 'close' }
]
const { show } = useToast()

const favoriteMovies = computed(() =>
  favorites.value.map(find).filter(m => !!m)
)
const followingMovies = computed(() =>
  following.value.map(find).filter(m => !!m)
)
const episodesWatched = computed(() => history.value.reduce((n, h) => n + h.ep, 0))

// Clearing is undoable, so it needs no confirmation dialog
function clearHistory() {
  const saved = history.value
  history.value = []
  show('បានសម្អាតប្រវត្តិមើល', { label: 'មិនធ្វើវិញ', run: () => (history.value = saved) })
}
</script>

<template>
  <div class="page">
    <h1 class="sr-only">ខ្ញុំ</h1>

    <section class="profile">
      <div class="avatar" aria-hidden="true"><AppIcon name="user" :size="28" /></div>
      <div class="who">
        <strong>ភ្ញៀវ</strong>
        <ClientOnly fallback=" ">
          <span>បានមើល {{ kh(episodesWatched) }} វគ្គ · រក្សាទុក {{ kh(favorites.length) }} រឿង</span>
        </ClientOnly>
      </div>
      <NuxtLink to="/vip" class="vip-card">
        <AppIcon name="crown" :size="20" />
        <div>
          <strong>ដំឡើងជា VIP</strong>
          <span>ដោះសោគ្រប់វគ្គ ចាប់ពី $1.25 / ខែ</span>
        </div>
        <AppIcon name="chevron-right" :size="18" />
      </NuxtLink>
    </section>

    <section class="appearance">
      <div class="head">
        <h2>រូបរាង</h2>
      </div>
      <ThemeSwitcher variant="segmented" />
    </section>

    <section class="appearance">
      <div class="head">
        <h2>សន្សំទិន្នន័យ</h2>
      </div>
      <SegmentedControl v-model="prefs.dataSaver" :options="saverOptions" label="សន្សំទិន្នន័យ" />
      <p class="hint">
        <ClientOnly fallback=" ">{{ saverReason }}</ClientOnly>
        — មិនទាញវគ្គបន្ទាប់ទុកមុន ចាប់ផ្តើមវីដេអូកម្រិតទាប និងប្រើរូបភាពតូចជាង។
      </p>
    </section>

    <!-- Install: a button where the browser offers a prompt, instructions on iPhone -->
    <section v-if="hydrated && !installState.installed && (installState.canPrompt || installState.ios)" class="install">
      <img src="/icons/icon-192.png" alt="" width="48" height="48">
      <div>
        <strong>តំឡើង RuengFlix</strong>
        <p v-if="installState.canPrompt">បើកលឿនពីអេក្រង់ដើម ដូចកម្មវិធីមួយ។</p>
        <p v-else>ចុច <b>Share</b> <AppIcon name="share" :size="14" /> ហើយជ្រើស <b>Add to Home Screen</b>។</p>
      </div>
      <button v-if="installState.canPrompt" type="button" class="btn btn-primary" @click="onInstall">តំឡើង</button>
    </section>

    <ClientOnly>
      <section>
        <div class="head">
          <h2>បន្តមើល</h2>
          <button v-if="continueWatching.length" type="button" class="link" @click="clearHistory">សម្អាតប្រវត្តិ</button>
        </div>
        <div v-if="continueWatching.length" class="grid">
          <ContinueCard
            v-for="{ entry, movie } in continueWatching"
            :key="movie.id"
            :movie="movie"
            :entry="entry"
          />
        </div>
        <EmptyState v-else icon="history" message="រឿងដែលអ្នកមើលនឹងបង្ហាញនៅទីនេះ ដើម្បីបន្តមើលពីវគ្គចុងក្រោយ។">
          <NuxtLink to="/shorts" class="btn btn-outline">សាកមើលខ្លីៗ</NuxtLink>
        </EmptyState>
      </section>

      <section v-if="followingMovies.length">
        <div class="head">
          <h2>កំពុងតាមដាន</h2>
        </div>
        <div class="grid">
          <PosterCard v-for="m in followingMovies" :key="m.id" :movie="m" />
        </div>
      </section>

      <section>
        <div class="head">
          <h2>ចំណូលចិត្ត</h2>
        </div>
        <div v-if="favoriteMovies.length" class="grid">
          <PosterCard v-for="m in favoriteMovies" :key="m.id" :movie="m" />
        </div>
        <EmptyState v-else icon="heart" message="ចុច “រក្សាទុក” នៅលើរឿងណាមួយ ដើម្បីរក្សាទុកវានៅទីនេះ។">
          <NuxtLink to="/browse" class="btn btn-outline">រុករករឿង</NuxtLink>
        </EmptyState>
      </section>
    </ClientOnly>
  </div>
</template>

<style scoped>
.profile {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  margin-bottom: 36px;
  padding: 20px;
  border-radius: 18px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
}

.avatar {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--bg-elev-2);
  color: var(--text-muted);
}

.who {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 160px;
}

.who strong {
  color: var(--text-strong);
  font-size: 18px;
}

.who span {
  color: var(--text-muted);
  font-size: 14px;
}

.vip-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, #2b2208, #3d300a);
  color: #fff;
}

.vip-card > svg:first-child {
  color: #ffd101;
}

.vip-card div {
  display: flex;
  flex-direction: column;
}

.vip-card span {
  color: rgba(255, 255, 255, 0.75);
  font-size: 13px;
}

.vip-card:hover {
  filter: brightness(1.15);
}

section {
  margin-bottom: 40px;
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

h2 {
  margin: 0;
  color: var(--text-strong);
  font-size: 21px;
}

.link {
  min-height: 44px;
  color: var(--text-muted);
}

.link:hover {
  color: var(--text-strong);
}

.appearance {
  max-width: 480px;
}

.install {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px 16px;
  max-width: 480px;
  padding: 16px;
  border-radius: 16px;
  background: var(--bg-elev);
  border: 1px solid var(--border);
}

.install img {
  border-radius: 12px;
}

.install div {
  flex: 1;
  min-width: 180px;
}

.install strong {
  color: var(--text-strong);
}

.install p {
  margin: 2px 0 0;
  color: var(--text-muted);
  font-size: 14px;
}

.hint {
  margin: 10px 2px 0;
  color: var(--text-muted);
  font-size: 14px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 20px 16px;
}

@media (max-width: 768px) {
  .profile {
    padding: 16px;
  }

  .vip-card {
    flex: 1 0 100%;
  }

  .vip-card div {
    flex: 1;
  }

  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px 10px;
  }
}
</style>
