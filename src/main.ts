import './styles/main.scss'
import Lenis from 'lenis'
import { initNav } from './scripts/nav'
import { initScrollReveal } from './scripts/scroll-reveal'
import { initParallax } from './scripts/parallax'
import { initPolaroids } from './scripts/polaroids'
import { initToggle } from './scripts/toggle'
import { initTabs } from './scripts/tabs'
import { initGallery } from './scripts/gallery'
import { initTilt } from './scripts/tilt'

// Smooth scroll (Lenis)
const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// lerp mode keeps scrolling frame-rate independent, so it stays snappy on ProMotion
let lenis: Lenis | null = null

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

  // Wait for fonts so we don't animate before text is laid out
  document.fonts.ready.then(() => {
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
        window.addEventListener('scroll', () => updateParallax(window.scrollY), { passive: true })
      }
      updateParallax(window.scrollY)
    }
  })
})
