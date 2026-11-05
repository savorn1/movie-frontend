/*
 * Coins arc from where they were earned (check-in, a mission, a purchase) into the header's coin chip,
 * which then pops and counts up. Teaches where coins live. The header waits for the coins to land
 * before counting (see AppHeader). Skipped when the chip isn't on screen or motion is reduced.
 */
const FLIGHT_MS = 650

export function useCoinFlight() {
  /** When the last coin lands (ms), so the header starts counting then */
  const landsAt = useState('coin-lands-at', () => 0)

  function fly(from: Element | null | undefined, amount = 5) {
    if (!import.meta.client || !from || reducedMotion()) return
    const chip = document.querySelector('.coin-chip')
    if (!chip) return
    const a = from.getBoundingClientRect()
    const b = chip.getBoundingClientRect()
    if (!b.width) return
    const count = Math.min(8, Math.max(3, Math.round(amount / 10)))
    const start = { x: a.left + a.width / 2, y: a.top + a.height / 2 }
    const end = { x: b.left + 18, y: b.top + b.height / 2 }
    landsAt.value = Date.now() + FLIGHT_MS + count * 45
    for (let i = 0; i < count; i++) {
      const coin = document.createElement('span')
      coin.className = 'flying-coin'
      coin.setAttribute('aria-hidden', 'true')
      document.body.appendChild(coin)
      // An arc: up and over, a little spread so they don't stack
      const lift = 80 + Math.random() * 60
      const spread = (Math.random() - 0.5) * 50
      const midX = (start.x + end.x) / 2 + spread
      const midY = Math.min(start.y, end.y) - lift
      const anim = coin.animate(
        [
          { transform: `translate(${start.x}px, ${start.y}px) scale(0.6)`, opacity: 0 },
          { transform: `translate(${start.x + spread / 2}px, ${start.y - 20}px) scale(1)`, opacity: 1, offset: 0.15 },
          { transform: `translate(${midX}px, ${midY}px) scale(1)`, opacity: 1, offset: 0.55 },
          { transform: `translate(${end.x}px, ${end.y}px) scale(0.5)`, opacity: 0.9 }
        ],
        { duration: FLIGHT_MS, delay: i * 45, easing: 'cubic-bezier(0.5, 0, 0.6, 1)', fill: 'both' }
      )
      anim.onfinish = () => {
        coin.remove()
        if (i === count - 1) chip.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.18)' }, { transform: 'scale(1)' }], { duration: 300, easing: 'cubic-bezier(0.2, 1.5, 0.4, 1)' })
      }
    }
  }

  return { fly, landsAt }
}
