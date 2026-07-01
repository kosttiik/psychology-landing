import { stopScroll, startScroll } from './smooth-scroll'

export function initNav(): void {
  const nav = document.getElementById('nav') as HTMLElement
  const burger = document.getElementById('burger') as HTMLButtonElement
  const mobileMenu = document.getElementById('nav-mobile') as HTMLElement
  const mobileLinks = document.querySelectorAll<HTMLAnchorElement>('[data-mobile-link]')

  // Sticky / scroll glass effect
  const onScroll = () => {
    if (window.scrollY > 60) {
      nav.classList.add('is-scrolled')
    } else {
      nav.classList.remove('is-scrolled')
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true })
  onScroll()

  // Burger / mobile menu
  let menuOpen = false

  const toggleMenu = (open: boolean) => {
    menuOpen = open
    burger.classList.toggle('is-open', open)
    burger.setAttribute('aria-expanded', String(open))
    mobileMenu.classList.toggle('is-open', open)
    mobileMenu.setAttribute('aria-hidden', String(!open))
    if (open) stopScroll()
    else startScroll()
  }

  burger.addEventListener('click', () => toggleMenu(!menuOpen))

  mobileLinks.forEach(link => {
    link.addEventListener('click', () => toggleMenu(false))
  })

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && menuOpen) toggleMenu(false)
  })

  // Close on outside click
  mobileMenu.addEventListener('click', (e) => {
    if (e.target === mobileMenu) toggleMenu(false)
  })

  initScrollSpy()
}

// Highlight the nav link for the section currently in view. Plain scroll +
// getBoundingClientRect rather than IntersectionObserver — IO has proven
// unreliable in nested-iframe previews of this environment.
function initScrollSpy(): void {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav__link'))
  const tracked = links
    .map(link => {
      const id = link.getAttribute('href')?.slice(1)
      const section = id ? document.getElementById(id) : null
      return section ? { link, section } : null
    })
    .filter((entry): entry is { link: HTMLAnchorElement; section: HTMLElement } => entry !== null)

  if (tracked.length === 0) return

  // A section counts as "current" once its top has scrolled up past roughly
  // the sticky nav's height, so the highlight switches a beat before the
  // section fully fills the viewport rather than lagging behind it.
  const ACTIVATION_OFFSET = 140

  const setActive = (): void => {
    let current: HTMLAnchorElement | null = null
    for (const { link, section } of tracked) {
      if (section.getBoundingClientRect().top <= ACTIVATION_OFFSET) {
        current = link
      }
    }
    links.forEach(link => link.classList.toggle('is-active', link === current))
  }

  let ticking = false
  window.addEventListener('scroll', () => {
    if (ticking) return
    ticking = true
    requestAnimationFrame(() => {
      setActive()
      ticking = false
    })
  }, { passive: true })

  setActive()
}
