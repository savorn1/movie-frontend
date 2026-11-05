export interface Toast {
  id: number
  message: string
  action?: { label: string; run: () => void }
  /** success and error get an icon and a matching vibration */
  tone?: 'success' | 'error'
}

let nextId = 1

// Feedback lives in the interface, not in alerts; reversible actions offer Undo instead of a confirm.
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function show(message: string, action?: Toast['action'], tone?: Toast['tone']) {
    const id = nextId++
    toasts.value = [...toasts.value.slice(-2), { id, message, action, tone }]
    if (tone) haptic(tone)
    setTimeout(() => dismiss(id), action ? 6000 : 3500)
  }

  /** Something worked (paid, unlocked, checked in): check icon and a success vibration */
  const success = (message: string, action?: Toast['action']) => show(message, action, 'success')
  /** Something failed: warning icon and an error vibration */
  const fail = (message: string) => show(message, undefined, 'error')

  return { toasts, show, success, fail, dismiss }
}
