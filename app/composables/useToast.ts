export interface Toast {
  id: number
  message: string
  action?: { label: string; run: () => void }
}

let nextId = 1

// Feedback lives in the interface, not in alerts; reversible actions offer Undo instead of a confirm.
export function useToast() {
  const toasts = useState<Toast[]>('toasts', () => [])

  function dismiss(id: number) {
    toasts.value = toasts.value.filter(t => t.id !== id)
  }

  function show(message: string, action?: Toast['action']) {
    const id = nextId++
    toasts.value = [...toasts.value.slice(-2), { id, message, action }]
    setTimeout(() => dismiss(id), action ? 6000 : 3500)
  }

  return { toasts, show, dismiss }
}
