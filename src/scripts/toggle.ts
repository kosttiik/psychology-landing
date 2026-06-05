export function initToggle(): void {
  const toggleEl = document.getElementById('ba-toggle') as HTMLElement | null
  const board = document.getElementById('ba-board') as HTMLElement | null

  if (!toggleEl || !board) return

  const cards = board.querySelectorAll<HTMLElement>('.ba__card')
  let isAfter = false

  const switchState = (after: boolean) => {
    isAfter = after
    toggleEl.classList.toggle('is-after', after)
    toggleEl.setAttribute('aria-checked', String(after))

    // Update label active states
    const labels = toggleEl.querySelectorAll<HTMLElement>('.toggle-label')
    labels[0]?.classList.toggle('is-active', !after)
    labels[1]?.classList.toggle('is-active', after)

    // Flip all cards (stagger via CSS --i custom property)
    cards.forEach(card => card.classList.toggle('is-flipped', after))
  }

  // Set initial label state
  const labels = toggleEl.querySelectorAll<HTMLElement>('.toggle-label')
  labels[0]?.classList.add('is-active')

  toggleEl.addEventListener('click', () => switchState(!isAfter))

  toggleEl.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      switchState(!isAfter)
    }
    if (e.key === 'ArrowRight') switchState(true)
    if (e.key === 'ArrowLeft')  switchState(false)
  })
}
