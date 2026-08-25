import './styles/main.scss'
import { initSmoothScroll, syncInitialHash } from './scripts/smooth-scroll'
import { initNav } from './scripts/nav'
import { initScrollReveal } from './scripts/scroll-reveal'
import { initParallax } from './scripts/parallax'
import { initPhotos } from './scripts/photos'
import { initPolaroids } from './scripts/polaroids'
import { initToggle } from './scripts/toggle'
import { initTabs } from './scripts/tabs'
import { initGallery } from './scripts/gallery'
import { initTilt } from './scripts/tilt'
import { initTelegram } from './scripts/telegram'

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

// Init as soon as the DOM is ready. The first screen must remain visible while
// optional fonts and photo layout enhancements settle in the background.
document.addEventListener('DOMContentLoaded', () => {
  // Dynamic copyright year
  const yearEl = document.getElementById('footer-year')
  if (yearEl) yearEl.textContent = String(new Date().getFullYear())

  initNav()
  initScrollReveal()
  initToggle()
  initTabs()
  initGallery()
  initTilt()
  initTelegram()
  initScrollHint()

  const setupParallax = (): void => {
    initPolaroids()

    // Drive parallax from Lenis so it stays in sync with the smooth scroll.
    const updateParallax = initParallax()
    if (!updateParallax) return

    if (lenis) {
      lenis.on('scroll', () => updateParallax(window.scrollY))
    } else {
      // Coalesce native scroll events into one update per frame.
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

  // Resolve the adaptive photo layout without blocking first paint. The
  // fallback still initializes motion if a portrait request fails.
  void initPhotos().then(() => {
    setupParallax()
    syncInitialHash()
  }, () => {
    setupParallax()
    syncInitialHash()
  })
})
