import QRCode from 'qrcode'

export interface OrderView {
  id: number
  kind: 'COINS' | 'SERIES' | 'VIP'
  amountUsd: number
  coins: number | null
  seriesId: number | null
  seriesTitle: string | null
  months: number | null
  /** First top-up bonus added on top of the pack, once paid */
  bonusCoins: number | null
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED' | 'REFUNDED'
  billNumber: string
  khqr: string | null
  expiresAt: string
  createdAt: string
  paidAt: string | null
  autoConfirm: boolean
}

/**
 * The order as the page needs it: the KHQR as an SVG to scan, and as a PNG to save and open in a banking
 * app on the same phone (both null once it can't be paid)
 */
export async function withQr(order: OrderView) {
  const open = !!order.khqr
  return {
    ...order,
    qrSvg: open ? await QRCode.toString(order.khqr!, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }) : null,
    qrPng: open ? await QRCode.toDataURL(order.khqr!, { width: 640, margin: 2, errorCorrectionLevel: 'M' }) : null
  }
}
