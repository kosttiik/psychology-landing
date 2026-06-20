// Mouse-tilt 3D for cards. Desktop only, off under reduced-motion.
//
// Writes --tilt-x/--tilt-y only; the CSS composes them into the element's
// transform next to its base rotation and hover lift. That way the tilt never
// clobbers other motion (the old inline-transform version permanently erased
// the polaroids' base tilt after the first hover). Pointer events are
// coalesced to one style write per frame.

function attachTilt(el: HTMLElement, maxTilt: number): void {
  let raf = 0
  let tiltX = 0
  let tiltY = 0

  const write = (): void => {
    raf = 0
    el.style.setProperty('--tilt-x', `${tiltX.toFixed(2)}deg`)
    el.style.setProperty('--tilt-y', `${tiltY.toFixed(2)}deg`)
  }

  el.addEventListener('pointermove', (e: PointerEvent) => {
    const rect = el.getBoundingClientRect()
    const dx = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const dy = ((e.clientY - rect.top) / rect.height) * 2 - 1
    tiltX = -dy * maxTilt
    tiltY = dx * maxTilt
    if (!raf) raf = requestAnimationFrame(write)
  })

  const reset = (): void => {
    if (raf) {
      cancelAnimationFrame(raf)
      raf = 0
    }
    tiltX = 0
    tiltY = 0
    el.style.setProperty('--tilt-x', '0deg')
    el.style.setProperty('--tilt-y', '0deg')
  }

  el.addEventListener('pointerleave', reset)
  el.addEventListener('pointercancel', reset)
}

export function initTilt(): void {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) return

  const isTouch = window.matchMedia('(hover: none)').matches
  if (isTouch) return

  // Hero polaroids, strong tilt
  document.querySelectorAll<HTMLElement>('.hero__polaroid').forEach(el =>
    attachTilt(el, 10)
  )

  // Approach materials cards, subtle
  document.querySelectorAll<HTMLElement>('.approach__materials').forEach(el =>
    attachTilt(el, 4)
  )

  // Gallery and before/after cards are skipped - their CSS transforms would fight the tilt.
}
