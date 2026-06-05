// Mouse-tilt 3D for cards. Desktop only, off under reduced-motion.

interface TiltOptions {
  maxTilt?: number
  perspective?: number
  scale?: number
  speed?: number
}

function attachTilt(el: HTMLElement, opts: TiltOptions = {}): void {
  const { maxTilt = 8, perspective = 800, scale = 1.03, speed = 400 } = opts

  el.style.willChange = 'transform'
  el.style.transition = `transform ${speed}ms cubic-bezier(0.25,0.46,0.45,0.94)`

  el.addEventListener('mousemove', (e: MouseEvent) => {
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    const dx = (e.clientX - cx) / (rect.width / 2)
    const dy = (e.clientY - cy) / (rect.height / 2)
    el.style.transform =
      `perspective(${perspective}px) rotateX(${-dy * maxTilt}deg) rotateY(${dx * maxTilt}deg) scale(${scale})`
  })

  el.addEventListener('mouseleave', () => {
    el.style.transform =
      `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale(1)`
  })
}

export function initTilt(): void {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) return

  const isTouch = window.matchMedia('(hover: none)').matches
  if (isTouch) return

  // Hero polaroids, strong tilt
  document.querySelectorAll<HTMLElement>('.hero__polaroid').forEach(el =>
    attachTilt(el, { maxTilt: 12, perspective: 600, scale: 1.04, speed: 300 })
  )

  // Approach materials cards
  document.querySelectorAll<HTMLElement>('.approach__materials').forEach(el =>
    attachTilt(el, { maxTilt: 5, perspective: 1000, scale: 1.02, speed: 400 })
  )

  // Gallery and before/after cards are skipped - their CSS transforms would fight the tilt.
}
