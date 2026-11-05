/**
 * "៛៤,១០០": a dollar price in riel for display, rounded to the nearest 100 riel (the smallest note in
 * common use). Payments are charged in USD; this is a guide, so callers show it with "≈".
 */
export function riel(usd: number) {
  const rate = Number(useRuntimeConfig().public.khrPerUsd) || 4100
  const amount = Math.round((usd * rate) / 100) * 100
  return `៛${kh(amount.toLocaleString('en-US'))}`
}
