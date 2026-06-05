// Keep the last-touched hero polaroid on top. z-index can't animate, so doing
// this on :hover/exit snaps back ugly; here we just promote and leave it.
export function initPolaroids(): void {
  const cards = Array.from(
    document.querySelectorAll<HTMLElement>('.hero__polaroid')
  )
  if (cards.length === 0) return

  // Base z-indexes are 1-3 in CSS; start above them
  let topZ = 10

  const bringToFront = (el: HTMLElement): void => {
    if (el.style.zIndex === String(topZ)) return
    topZ += 1
    el.style.zIndex = String(topZ)
  }

  cards.forEach((card) => {
    // pointerenter = mouse hover, pointerdown = touch/tap
    card.addEventListener('pointerenter', () => bringToFront(card))
    card.addEventListener('pointerdown', () => bringToFront(card))
  })
}
