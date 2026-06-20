// Scroll-driven motion. Two effects, both off under reduced-motion and softer on touch:
//   data-py / data-px / data-rot  -> page-linked translate/rotate via CSS vars
//   data-scroll-3d                -> viewport-linked tilt, feeds --p from +1 to -1
// Returns an update(scrollY) we call from the Lenis loop.
//
// Element geometry is cached and refreshed on resize / page-height changes, so
// the per-frame update is writes-only (no getBoundingClientRect -> no forced
// reflow between the CSS-var writes).
export function initParallax(): ((scrollY: number) => void) | null {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (prefersReduced) return null

  const isTouch = window.matchMedia('(hover: none)').matches
  const touchScale = isTouch ? 0.4 : 1   // soften on touch

  // Page-linked elements
  const linear = Array.from(
    document.querySelectorAll<HTMLElement>('[data-py],[data-px],[data-rot]')
  ).map((el) => ({
    el,
    py: parseFloat(el.dataset['py'] ?? '0') * touchScale,
    px: parseFloat(el.dataset['px'] ?? '0') * touchScale,
    rot: parseFloat(el.dataset['rot'] ?? '0') * touchScale,
  }))

  // Viewport-linked 3D elements
  const depth = Array.from(
    document.querySelectorAll<HTMLElement>('[data-scroll-3d]')
  ).map((el) => ({
    el,
    strength: (parseFloat(el.dataset['scroll3d'] || '1') || 1) * (isTouch ? 0.45 : 1),
    top: 0,
    height: 0,
  }))

  if (linear.length === 0 && depth.length === 0) return null

  let viewH = window.innerHeight

  const measure = (): void => {
    viewH = window.innerHeight
    const scrollY = window.scrollY
    for (const it of depth) {
      const rect = it.el.getBoundingClientRect()
      it.top = rect.top + scrollY
      it.height = rect.height
    }
  }
  measure()

  // Layout shifts move the cached offsets: viewport resizes, tab panels
  // changing the page height, late image/font loads. Debounced re-measure.
  let measureTimer: ReturnType<typeof setTimeout>
  const queueMeasure = (): void => {
    clearTimeout(measureTimer)
    measureTimer = setTimeout(measure, 150)
  }
  window.addEventListener('resize', queueMeasure)
  window.addEventListener('load', measure)
  if (depth.length > 0 && 'ResizeObserver' in window) {
    new ResizeObserver(queueMeasure).observe(document.body)
  }

  return (scrollY: number): void => {
    for (const it of linear) {
      if (it.py) it.el.style.setProperty('--py-val', `${-scrollY * it.py}px`)
      if (it.px) it.el.style.setProperty('--px-val', `${-scrollY * it.px}px`)
      if (it.rot) it.el.style.setProperty('--rot-val', `${(scrollY / 1000) * it.rot}deg`)
    }

    const half = viewH / 2
    for (const it of depth) {
      const center = it.top - scrollY + it.height / 2
      // +1 at the bottom edge, 0 at mid-screen, -1 at the top; clamp off-screen
      const p = Math.max(-1, Math.min(1, (center - half) / half))
      it.el.style.setProperty('--p', (p * it.strength).toFixed(4))
    }
  }
}
