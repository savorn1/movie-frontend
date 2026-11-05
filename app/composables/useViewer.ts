import { EMPTY_LIBRARY } from '#shared/data/librarySync'

export interface ViewerAccount {
  id: number
  displayName: string
  /** "012 345 678"; null for accounts made with Telegram or Google */
  phone: string | null
  /** Phone + password sign-in works, so the password can be changed */
  hasPassword: boolean
  telegram: { username: string | null } | null
  google: { email: string } | null
  photoUrl: string | null
  createdAt: string
  /** Just signed in with Telegram or Google: a new password can be set without the old one */
  canResetPassword?: boolean
}

/** Sign-in buttons this server can offer */
export interface SignInMethods {
  telegram: boolean
  google: boolean
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
  SIGNED_OUT: 'សូមចូលគណនីម្តងទៀត',
  TELEGRAM_INVALID: 'មិនអាចផ្ទៀងផ្ទាត់ការចូលតាម Telegram បានទេ។ សូមព្យាយាមម្តងទៀត។',
  GOOGLE_FAILED: 'មិនអាចចូលតាម Google បានទេ។ សូមព្យាយាមម្តងទៀត។',
  GOOGLE_EXPIRED: 'ការចូលតាម Google ផុតពេលហើយ។ សូមព្យាយាមម្តងទៀត។',
  CANCELLED: 'បានបោះបង់ការចូលគណនី',
  IDENTITY_TAKEN: 'គណនីនេះភ្ជាប់ជាមួយអ្នកមើលម្នាក់ទៀតរួចហើយ',
  NO_TELEGRAM: 'សូមភ្ជាប់ Telegram ទៅគណនីជាមុនសិន'
}

const PAYMENT_MESSAGES: Record<string, string> = {
  PAYMENTS_OFF: 'ការបង់ប្រាក់តាម KHQR មិនទាន់ដំណើរការនៅឡើយទេ',
  NO_PRODUCT: 'មិនមានផលិតផលនេះទេ',
  ALREADY_OWNED: 'អ្នកបានដោះសោរឿងនេះរួចហើយ',
  NOT_ENOUGH_COINS: 'កាក់មិនគ្រប់គ្រាន់ទេ',
  ALREADY_CHECKED_IN: 'អ្នកបានចុះឈ្មោះថ្ងៃនេះរួចហើយ',
  NOT_VIP_EPISODE: 'វគ្គនេះមើលបានដោយឥតគិតថ្លៃ',
  COMMENT_INVALID: 'សូមសរសេរមតិ (មិនលើស ៥០០ តួ)',
  EMPTY: 'សូមសរសេរមតិ'
}

/** The Khmer message for a failed payment, coin or comment call */
export function paymentError(err: unknown): string {
  const code = (err as { data?: { data?: { code?: string } } }).data?.data?.code
  if (code && PAYMENT_MESSAGES[code]) return PAYMENT_MESSAGES[code]
  return accountError(err)
}

/** The Khmer message for an error code in the address (?error=… after Google sends someone back) */
export const accountErrorFromCode = (code: unknown) =>
  (typeof code === 'string' && MESSAGES[code]) || 'មានបញ្ហា។ សូមព្យាយាមម្តងទៀត។'

/** The Khmer message for a failed auth call */
export function accountError(err: unknown): string {
  const e = err as { statusCode?: number; data?: { data?: { code?: string } } }
  const code = e.data?.data?.code
  if (code && MESSAGES[code]) return MESSAGES[code]
  if (e.statusCode === 429) return 'ព្យាយាមច្រើនដងពេក។ សូមរង់ចាំបន្តិចសិន។'
  return 'មានបញ្ហា។ សូមព្យាយាមម្តងទៀត។'
}

/**
 * The signed-in viewer (phone + password, Telegram or Google, through RuengFlix's /api/auth). Loaded in the
 * browser after the page starts (sync.client plugin), so server HTML never depends on it.
 */
export function useViewer() {
  const viewer = useState<ViewerAccount | null>('viewer', () => null)
  /** False when the server has no movie-api or session secret: account links stay hidden */
  const enabled = useState('viewer-enabled', () => false)
  /** True once the first /api/auth/me answered */
  const known = useState('viewer-known', () => false)
  const methods = useState<SignInMethods>('viewer-methods', () => ({ telegram: false, google: false }))
  /** This browser came through a friend's invite link (shown on the sign-up page) */
  const invited = useState('viewer-invited', () => false)

  async function refreshViewer() {
    try {
      const me = await $fetch<{ enabled: boolean; methods: SignInMethods; invited?: boolean; viewer: ViewerAccount | null }>('/api/auth/me')
      invited.value = !!me.invited
      enabled.value = me.enabled
      methods.value = me.methods
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

  /** The Telegram Login Widget's data; `link` adds Telegram to the signed-in account */
  async function signInWithTelegram(data: Record<string, unknown>, link = false) {
    viewer.value = (
      await $fetch<{ viewer: ViewerAccount }>('/api/auth/telegram', { method: 'POST', body: { data, link } })
    ).viewer
  }

  /** Where "Continue with Google" goes; `link` adds Google to the signed-in account */
  const googleUrl = (next: string, link = false) =>
    `/api/auth/google?${new URLSearchParams({ next, ...(link ? { link: '1' } : {}) })}`

  /** `current` null: "forgot password", allowed right after signing in with Telegram or Google */
  async function changePassword(current: string | null, next: string) {
    viewer.value = (await $fetch<{ viewer: ViewerAccount }>('/api/auth/password', { method: 'POST', body: current === null ? { next } : { current, next } })).viewer
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

  /** Delete the account for good; this device is signed out and its copy of the library cleared */
  async function deleteAccount() {
    await $fetch('/api/auth/account', { method: 'DELETE', body: { confirm: 'DELETE' } })
    await logout()
  }

  return { viewer, enabled, known, methods, invited, refreshViewer, login, register, signInWithTelegram, googleUrl, changePassword, logout, deleteAccount }
}
