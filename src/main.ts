import './styles/main.scss'
import { initSmoothScroll } from './scripts/smooth-scroll'
import { initNav } from './scripts/nav'
import { initScrollReveal } from './scripts/scroll-reveal'
import { initParallax } from './scripts/parallax'
import { initPhotos } from './scripts/photos'
import { initPolaroids } from './scripts/polaroids'
import { initToggle } from './scripts/toggle'
import { initTabs } from './scripts/tabs'
import { initGallery } from './scripts/gallery'
import { initTilt } from './scripts/tilt'

const lenis = initSmoothScroll()

// Scroll hint: show after 2s of no scroll, hide for good on first scroll
function initScrollHint(): void {
  const hint = document.querySelector<HTMLElement>('.scroll-hint')
  if (!hint) return

  let dismissed = false

  const dismiss = (): void => {
    if (dismissed) return
    dismissed = true
    hint.classList.remove('is-visible')
    hint.classList.add('is-dismissed')
    clearTimeout(showTimer)
    window.removeEventListener('scroll', onScroll)
    setTimeout(() => hint.remove(), 600)
  }

  const onScroll = (): void => {
    if (window.scrollY > 40) dismiss()
  }

  const showTimer = setTimeout(() => {
    if (!dismissed && window.scrollY < 40) hint.classList.add('is-visible')
  }, 2000)

  window.addEventListener('scroll', onScroll, { passive: true })
}

// Protect images from right-click save
document.addEventListener('contextmenu', (e) => {
  if (e.target instanceof HTMLImageElement) e.preventDefault()
}, true)

// Init after fonts + DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Dynamic copyright year
  const yearEl = document.getElementById('footer-year')
  if (yearEl) yearEl.textContent = String(new Date().getFullYear())

  // Wait for fonts so we don't animate before text is laid out, but cap the
  // wait: on a slow network the page must show up anyway.
  const fontsReady = Promise.race([
    document.fonts.ready,
    new Promise((resolve) => setTimeout(resolve, 1500)),
  ])

  // Resolve the adaptive photo layout in parallel with fonts; both are capped,
  // so the page never waits long. Settling it before we reveal the body means a
  // missing portrait collapses the layout without ever flashing a broken image.
  Promise.all([fontsReady, initPhotos()]).then(() => {
    document.documentElement.classList.add('fonts-ready')

    initNav()
    initScrollReveal()
    initPolaroids()
    initToggle()
    initTabs()
    initGallery()
    initTilt()
    initScrollHint()

    // Drive parallax from Lenis so it stays in sync with the smooth scroll
    const updateParallax = initParallax()
    if (updateParallax) {
      if (lenis) {
        lenis.on('scroll', () => updateParallax(window.scrollY))
      } else {
        // Coalesce native scroll events into one update per frame
        let ticking = false
        window.addEventListener('scroll', () => {
          if (ticking) return
          ticking = true
          requestAnimationFrame(() => {
            updateParallax(window.scrollY)
            ticking = false
          })
        }, { passive: true })
      }
      updateParallax(window.scrollY)
    }
  })
})
