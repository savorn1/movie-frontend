/**
 * Where to send a viewer once a payment goes through: the page they paid from (usually the episode
 * behind an unlock screen). Kept in this browser per order, so the late-payment notice can offer
 * "Back to episode 7" even after the KHQR screen was closed.
 */
const key = (orderId: number) => `rf-order-return-${orderId}`

export function rememberOrderReturn(orderId: number, path: string) {
  try {
    localStorage.setItem(key(orderId), path)
  } catch {
    // Storage blocked: the notice just won't offer a way back
  }
}

export function orderReturn(orderId: number): string | null {
  try {
    return localPath(localStorage.getItem(key(orderId)))
  } catch {
    return null
  }
}

export function forgetOrderReturn(orderId: number) {
  try {
    localStorage.removeItem(key(orderId))
  } catch {
    // Nothing to do
  }
}
