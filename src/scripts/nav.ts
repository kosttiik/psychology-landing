import { isAnchorScrollActive, stopScroll, startScroll } from './smooth-scroll'

export function initNav(): void {
  const nav = document.getElementById('nav') as HTMLElement
  const burger = document.getElementById('burger') as HTMLButtonElement
  const mobileMenu = document.getElementById('nav-mobile') as HTMLElement
  const mobileLinks = document.querySelectorAll<HTMLAnchorElement>('[data-mobile-link]')
  const sectionLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav__link, .nav-mobile__link'))
  const logoLink = document.querySelector<HTMLAnchorElement>('.nav__logo')

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

  // A click selects the destination immediately. Scroll-spy updates are
  // paused by initScrollSpy while Lenis is carrying the page there, so links
  // passed on the way never steal the highlight from the user's choice.
  const selectFromHash = (hash: string): void => {
    const id = hash.slice(1)
    setActiveSection(id === 'home' ? null : id, sectionLinks)
  }

  sectionLinks.forEach(link => {
    link.addEventListener('click', () => selectFromHash(link.getAttribute('href') ?? ''))
  })
  logoLink?.addEventListener('click', () => setActiveSection(null, sectionLinks))

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
function setActiveSection(id: string | null, links: HTMLAnchorElement[]): void {
  links.forEach(link => {
    const isActive = id !== null && link.getAttribute('href') === `#${id}`
    link.classList.toggle('is-active', isActive)
    if (isActive) link.setAttribute('aria-current', 'location')
    else link.removeAttribute('aria-current')
  })
}

function initScrollSpy(): void {
  const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav__link'))
  const allLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>('.nav__link, .nav-mobile__link'))
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
    let currentId: string | null = null
    for (const { link, section } of tracked) {
      if (section.getBoundingClientRect().top <= ACTIVATION_OFFSET) {
        currentId = link.getAttribute('href')?.slice(1) ?? null
      }
    }
    setActiveSection(currentId, allLinks)
  }

  let ticking = false
  window.addEventListener('scroll', () => {
    if (ticking) return
    if (isAnchorScrollActive()) return
    ticking = true
    requestAnimationFrame(() => {
      setActive()
      ticking = false
    })
  }, { passive: true })

  setActive()

  // A deep link can be restored before web fonts and late image layout settle.
  // Recalculate once those dimensions are stable so the active link reflects
  // the section actually shown at the top of the viewport.
  void document.fonts.ready.then(() => {
    if (!isAnchorScrollActive()) setActive()
  })
  window.addEventListener('load', () => {
    if (!isAnchorScrollActive()) setActive()
  }, { once: true })
}
