export function initScrollReveal(): void {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (prefersReduced) {
    // Make everything visible immediately
    document.querySelectorAll<HTMLElement>('[data-reveal], [data-stagger], [data-scroll-3d]').forEach(el => {
      el.classList.add('is-visible')
    })
    return
  }

  const reveals = document.querySelectorAll<HTMLElement>('[data-reveal]')
  const staggers = document.querySelectorAll<HTMLElement>('[data-stagger]')
  // 3D elements just fade in once; their tilt is driven by parallax.ts
  const depth = document.querySelectorAll<HTMLElement>('[data-scroll-3d]')

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
  )

  reveals.forEach(el => observer.observe(el))
  staggers.forEach(el => observer.observe(el))
  depth.forEach(el => observer.observe(el))
}
