export function initTabs(): void {
  const tabBtns = document.querySelectorAll<HTMLButtonElement>('.approach__tab-btn')
  const wrap = document.querySelector<HTMLElement>('.approach__panels-wrap')

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset['tab']
      if (!target) return

      const currentActive = document.querySelector<HTMLElement>('.approach__panel.is-active')
      const newPanel = document.getElementById(`panel-${target}`)
      if (!newPanel || newPanel === currentActive) return

      tabBtns.forEach(b => {
        b.classList.remove('is-active')
        b.setAttribute('aria-selected', 'false')
      })
      btn.classList.add('is-active')
      btn.setAttribute('aria-selected', 'true')

      if (wrap) {
        // Lock to current height before swapping
        const oldH = wrap.offsetHeight
        wrap.style.transition = ''
        wrap.style.height = `${oldH}px`
        wrap.style.overflow = 'hidden'

        // Switch panels
        currentActive?.classList.remove('is-active')
        newPanel.classList.add('is-active')

        // Measure natural height with auto, otherwise shrinking panels won't animate down
        wrap.style.height = 'auto'
        const newH = wrap.offsetHeight
        // Back to oldH and force a reflow so the transition has a start value
        wrap.style.height = `${oldH}px`
        void wrap.offsetHeight

        if (newH === oldH) {
          // Same height, just release the lock
          wrap.style.height = 'auto'
          wrap.style.overflow = ''
          return
        }

        requestAnimationFrame(() => {
          wrap.style.transition = 'height 0.5s cubic-bezier(0.22,1,0.36,1)'
          wrap.style.height = `${newH}px`

          const onHeightEnd = (e: TransitionEvent) => {
            if (e.target !== wrap || e.propertyName !== 'height') return
            wrap.removeEventListener('transitionend', onHeightEnd)
            wrap.style.height = 'auto'
            wrap.style.overflow = ''
            wrap.style.transition = ''
          }
          wrap.addEventListener('transitionend', onHeightEnd)
        })
      } else {
        currentActive?.classList.remove('is-active')
        newPanel.classList.add('is-active')
      }
    })
  })

  // Arrow-key navigation between tabs (WAI-ARIA tabs pattern). Activation is
  // debounced so rapid arrow-tapping doesn't queue overlapping height/stagger
  // animations — only the tab the user settles on actually activates.
  let activateTimer: ReturnType<typeof setTimeout>
  tabBtns.forEach((btn, i) => {
    btn.addEventListener('keydown', (e: KeyboardEvent) => {
      let next = -1
      if (e.key === 'ArrowRight') next = (i + 1) % tabBtns.length
      if (e.key === 'ArrowLeft')  next = (i - 1 + tabBtns.length) % tabBtns.length
      if (next === -1) return
      e.preventDefault()
      const target = tabBtns[next]!
      target.focus()
      clearTimeout(activateTimer)
      activateTimer = setTimeout(() => target.click(), 150)
    })
  })

  // Replay entrance stagger when section scrolls into view
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const section = document.querySelector<HTMLElement>('.approach')
  if (prefersReduced || !section || !('IntersectionObserver' in window)) return

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return
      const active = document.querySelector<HTMLElement>('.approach__panel.is-active')
      if (active) {
        active.classList.remove('is-active')
        void active.offsetWidth
        active.classList.add('is-active')
      }
      io.disconnect()
    })
  }, { threshold: 0.2 })

  io.observe(section)
}
