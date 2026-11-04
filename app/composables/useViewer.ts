import { EMPTY_LIBRARY } from '#shared/data/librarySync'

export interface ViewerAccount {
  id: number
  phone: string
  displayName: string
  sessionVersion: number
  createdAt: string
}

/** Khmer messages for the error codes the auth routes return */
const MESSAGES: Record<string, string> = {
  WRONG_LOGIN: 'លេខទូរស័ព្ទ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ',
  DISABLED: 'គណនីនេះត្រូវបានបិទ។ សូមទាក់ទងមកយើងខ្ញុំ។',
  PHONE_INVALID: 'សូមបញ្ចូលលេខទូរស័ព្ទកម្ពុជាឲ្យបានត្រឹមត្រូវ (ឧ. 012 345 678)',
  PHONE_TAKEN: 'លេខទូរស័ព្ទនេះមានគណនីរួចហើយ។ សូមចូលគណនីវិញ។',
  NAME_REQUIRED: 'សូមបញ្ចូលឈ្មោះ',
  PASSWORD_SHORT: 'ពាក្យសម្ងាត់ត្រូវមានយ៉ាងហោចណាស់ ៨ តួ',
  PASSWORD_LONG: 'ពាក្យសម្ងាត់វែងពេក',
  WRONG_PASSWORD: 'ពាក្យសម្ងាត់បច្ចុប្បន្នមិនត្រឹមត្រូវ',
  UNAVAILABLE: 'មិនទាន់អាចប្រើគណនីបាននៅឡើយទេ',
  SIGNED_OUT: 'សូមចូលគណនីម្តងទៀត'
}

/** The Khmer message for a failed auth call */
export function accountError(err: unknown): string {
  const e = err as { statusCode?: number; data?: { data?: { code?: string } } }
  const code = e.data?.data?.code
  if (code && MESSAGES[code]) return MESSAGES[code]
  if (e.statusCode === 429) return 'ព្យាយាមច្រើនដងពេក។ សូមរង់ចាំបន្តិចសិន។'
  return 'មានបញ្ហា។ សូមព្យាយាមម្តងទៀត។'
}

/**
 * The signed-in viewer (phone + password accounts, through RuengFlix's /api/auth). Loaded in the
 * browser after the page starts (sync.client plugin), so server HTML never depends on it.
 */
export function useViewer() {
  const viewer = useState<ViewerAccount | null>('viewer', () => null)
  /** False when the server has no movie-api or session secret: account links stay hidden */
  const enabled = useState('viewer-enabled', () => false)
  /** True once the first /api/auth/me answered */
  const known = useState('viewer-known', () => false)

  async function refreshViewer() {
    try {
      const me = await $fetch<{ enabled: boolean; viewer: ViewerAccount | null }>('/api/auth/me')
      enabled.value = me.enabled
      viewer.value = me.viewer
    } catch {
      // Offline or server error: stay as we were
    } finally {
      known.value = true
    }
  }

  async function login(phone: string, password: string) {
    viewer.value = (await $fetch<{ viewer: ViewerAccount }>('/api/auth/login', { method: 'POST', body: { phone, password } })).viewer
  }

  async function register(phone: string, password: string, displayName: string) {
    viewer.value = (
      await $fetch<{ viewer: ViewerAccount }>('/api/auth/register', { method: 'POST', body: { phone, password, displayName } })
    ).viewer
  }

  async function changePassword(current: string, next: string) {
    viewer.value = (await $fetch<{ viewer: ViewerAccount }>('/api/auth/password', { method: 'POST', body: { current, next } })).viewer
  }

  /** Signs out and clears this device's copy of the library (it stays saved in the account) */
  async function logout() {
    await $fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
    viewer.value = null
    const lib = useLibrary()
    lib.history.value = [...EMPTY_LIBRARY.history]
    lib.favorites.value = []
    lib.following.value = []
    lib.unlocked.value = []
    lib.recentSearches.value = []
    lib.seen.value = {}
    lib.ratings.value = {}
  }

  return { viewer, enabled, known, refreshViewer, login, register, changePassword, logout }
}
