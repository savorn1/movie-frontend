import QRCode from 'qrcode'

export interface OrderView {
  id: number
  kind: 'COINS' | 'SERIES' | 'VIP'
  amountUsd: number
  coins: number | null
  seriesId: number | null
  seriesTitle: string | null
  months: number | null
  status: 'PENDING' | 'PAID' | 'EXPIRED' | 'CANCELLED'
  billNumber: string
  khqr: string | null
  expiresAt: string
  createdAt: string
  paidAt: string | null
  autoConfirm: boolean
}

/** The order as the page needs it: the KHQR also as an SVG to scan (null once it can't be paid) */
export async function withQr(order: OrderView) {
  return {
    ...order,
    qrSvg: order.khqr ? await QRCode.toString(order.khqr, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }) : null
  }
}
