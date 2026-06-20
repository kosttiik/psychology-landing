// Owns the Lenis instance so other modules can pause/resume scrolling
// (mobile menu, lightbox) without reaching into main.ts.
import Lenis from 'lenis'

let lenis: Lenis | null = null

const easeOutExpo = (t: number): number => Math.min(1, 1.001 - Math.pow(2, -10 * t))

// Route in-page anchor clicks through Lenis. Native smooth scroll would fight
// the virtual scroll position and jump on the next wheel event.
function initAnchors(): void {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (e) => {
      const hash = link.getAttribute('href')!
      if (hash.length < 2) return
      const target = document.querySelector<HTMLElement>(hash)
      if (!target) return

      e.preventDefault()
      // #home is the top of the page — scroll up but strip the hash so the URL
      // stays clean (a bare "#home" reads as clutter). Every other section is
      // reflected in the URL so the position stays shareable/deep-linkable.
      const url = hash === '#home' ? location.pathname + location.search : hash
      history.pushState(null, '', url)

      if (lenis) {
        // Defer one frame: when the click also closes the mobile menu, the
        // menu's own handler calls lenis.start(), and start() resets any
        // in-flight animation - starting the scroll afterwards keeps it alive.
        requestAnimationFrame(() => {
          lenis?.scrollTo(target, { duration: 1.15, easing: easeOutExpo, force: true })
        })
      } else {
        // Reduced-motion / no Lenis: jump without smoothing.
        target.scrollIntoView()
      }
    })
  })
}

export function initSmoothScroll(): Lenis | null {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (!prefersReduced) {
    lenis = new Lenis({
      lerp: 0.1,
      smoothWheel: true,
    })

    const raf = (time: number) => {
      lenis!.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }

  initAnchors()
  return lenis
}

// Scroll lock for overlays. Pairs lenis.stop() with a plain overflow lock so
// the reduced-motion (no Lenis) path keeps working.
export function stopScroll(): void {
  lenis?.stop()
  document.body.style.overflow = 'hidden'
}

export function startScroll(): void {
  lenis?.start()
  document.body.style.overflow = ''
}
