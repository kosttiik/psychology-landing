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
    document.body.style.overflow = open ? 'hidden' : ''
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
}
