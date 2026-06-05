export function initGallery(): void {
  const track = document.getElementById('gallery-track')
  const prevBtn = document.querySelector<HTMLButtonElement>('.gallery__arrow--prev')
  const nextBtn = document.querySelector<HTMLButtonElement>('.gallery__arrow--next')
  const dotsContainer = document.getElementById('gallery-dots')
  const lightbox = document.getElementById('gallery-lightbox')
  const lbTitle = lightbox?.querySelector<HTMLElement>('.gallery__lb-title')
  const lbClose = lightbox?.querySelector<HTMLButtonElement>('.gallery__lb-close')
  const lbPrev = lightbox?.querySelector<HTMLButtonElement>('.gallery__lb-prev')
  const lbNext = lightbox?.querySelector<HTMLButtonElement>('.gallery__lb-next')
  const lbImgEls = Array.from(lightbox?.querySelectorAll<HTMLImageElement>('.gallery__lb-img') ?? [])

  if (!track) return

  const items = Array.from(track.querySelectorAll<HTMLElement>('.gallery__item'))
  if (items.length === 0) return

  let current = 0
  let lbIdx = 0

  // Prevent right-click / long-press "save image" on all diploma images
  items.forEach(item => {
    const img = item.querySelector('img')
    if (!img) return
    img.addEventListener('contextmenu', e => e.preventDefault())
    img.addEventListener('dragstart', e => e.preventDefault())
  })
  lbImgEls.forEach(img => {
    img.addEventListener('contextmenu', e => e.preventDefault())
    img.addEventListener('dragstart', e => e.preventDefault())
  })

  // Geometry
  const getItemWidth = (): number => {
    const item = items[0]
    if (!item) return 224
    const style = getComputedStyle(track)
    const gap = parseFloat(style.columnGap || style.gap || '24')
    return item.getBoundingClientRect().width + gap
  }

  const getItemsPerPage = (): number => {
    const iw = getItemWidth()
    return iw > 0 ? Math.max(1, Math.floor(track.clientWidth / iw)) : 1
  }

  const getPageCount = (): number =>
    Math.max(1, items.length - getItemsPerPage() + 1)

  // Dots
  function buildDots() {
    if (!dotsContainer) return
    dotsContainer.innerHTML = ''
    const count = getPageCount()
    for (let i = 0; i < count; i++) {
      const dot = document.createElement('button')
      dot.className = 'gallery__dot'
      dot.setAttribute('aria-label', `Страница ${i + 1}`)
      dot.addEventListener('click', () => goTo(i))
      dotsContainer.appendChild(dot)
    }
  }

  function updateDots() {
    if (!dotsContainer) return
    const safeIdx = Math.min(current, getPageCount() - 1)
    dotsContainer.querySelectorAll('.gallery__dot').forEach((d, i) => {
      d.classList.toggle('is-active', i === safeIdx)
    })
  }

  function updateArrows() {
    if (prevBtn) prevBtn.disabled = current === 0
    if (nextBtn) nextBtn.disabled = current >= getPageCount() - 1
  }

  // Track navigation
  function goTo(index: number) {
    current = Math.max(0, Math.min(index, getPageCount() - 1))
    track!.scrollTo({ left: current * getItemWidth(), behavior: 'smooth' })
    updateDots()
    updateArrows()
  }

  prevBtn?.addEventListener('click', () => goTo(current - 1))
  nextBtn?.addEventListener('click', () => goTo(current + 1))

  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  goTo(current - 1)
    if (e.key === 'ArrowRight') goTo(current + 1)
  })

  let scrollTimer: ReturnType<typeof setTimeout>
  track.addEventListener('scroll', () => {
    clearTimeout(scrollTimer)
    scrollTimer = setTimeout(() => {
      const maxScroll = track.scrollWidth - track.clientWidth
      const pageCount = getPageCount()
      if (track.scrollLeft <= 1) {
        current = 0
      } else if (maxScroll <= 0 || track.scrollLeft >= maxScroll - 1) {
        current = pageCount - 1
      } else {
        const iw = getItemWidth()
        if (iw > 0) {
          current = Math.max(0, Math.min(Math.round(track.scrollLeft / iw), pageCount - 1))
        }
      }
      updateDots()
      updateArrows()
    }, 80)
  }, { passive: true })

  const ro = new ResizeObserver(() => {
    current = Math.max(0, Math.min(current, getPageCount() - 1))
    buildDots()
    updateDots()
    updateArrows()
  })
  ro.observe(track)

  // Lightbox. Two img slots: lbImgEls[lbSlot] is visible, the other is idle
  let lbSlot = 0
  let lbAnimating = false

  // Images sit centered at rest; the off-* positions park them past the edges
  const T_CENTER    = 'translate(-50%, -50%)'
  const T_OFF_RIGHT = 'translate(calc(-50% + 100vw), -50%)'
  const T_OFF_LEFT  = 'translate(calc(-50% - 100vw), -50%)'

  const SLIDE_MS   = 380
  const SLIDE_EASE = 'cubic-bezier(0.4, 0, 0.2, 1)'

  function applyInstant(img: HTMLImageElement, tf: string) {
    img.style.transition = 'none'
    img.style.transform  = tf
  }

  function applySlide(img: HTMLImageElement, tf: string) {
    img.style.transition = `transform ${SLIDE_MS}ms ${SLIDE_EASE}`
    img.style.transform  = tf
  }

  function getActive()   { return lbImgEls[lbSlot]! }
  function getIncoming() { return lbImgEls[1 - lbSlot]! }

  function setLbImage(index: number, dir: 1 | -1 | 0) {
    if (!lbTitle) return
    const item  = items[index]
    const src   = item?.dataset['src']   ?? ''
    const title = item?.dataset['title'] ?? ''

    if (dir === 0) {
      getActive().src      = src
      getActive().alt      = title
      lbTitle.textContent  = title
      updateLbButtons()
      return
    }

    if (lbAnimating) return
    lbAnimating = true

    const active   = getActive()
    const incoming = getIncoming()

    // Load into idle slot, park it off-screen on the correct side
    incoming.src = src
    incoming.alt = title
    applyInstant(incoming, dir > 0 ? T_OFF_RIGHT : T_OFF_LEFT)

    // Fade title out
    if (lbTitle) {
      lbTitle.style.transition = 'opacity 0.15s ease'
      lbTitle.style.opacity    = '0'
    }

    // Double rAF so the browser paints the parked position before sliding
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        applySlide(incoming, T_CENTER)
        applySlide(active,   dir > 0 ? T_OFF_LEFT : T_OFF_RIGHT)

        // Update title halfway through
        setTimeout(() => {
          if (lbTitle) {
            lbTitle.textContent  = title
            lbTitle.style.opacity = '1'
          }
          updateLbButtons()
        }, SLIDE_MS / 2)

        // Swap slots once the slide is done; leave the outgoing image off-screen
        setTimeout(() => {
          lbSlot      = 1 - lbSlot
          lbAnimating = false
        }, SLIDE_MS + 20)
      })
    })
  }

  function openLightbox(index: number) {
    if (!lightbox) return
    lbIdx    = index
    lbSlot   = 0
    lbAnimating = false

    lightbox.classList.remove('is-closing')
    lightbox.hidden = false
    document.body.style.overflow = 'hidden'

    // Active image - centered, no transition
    const active = getActive()
    applyInstant(active, T_CENTER)
    active.src = items[lbIdx]?.dataset['src']   ?? ''
    active.alt = items[lbIdx]?.dataset['title'] ?? ''
    active.style.zIndex = '1'

    // Idle image - parked off right, invisible
    const incoming = getIncoming()
    applyInstant(incoming, T_OFF_RIGHT)
    incoming.src = ''
    incoming.style.zIndex = '1'

    if (lbTitle) {
      lbTitle.style.transition = 'none'
      lbTitle.style.opacity    = '1'
      lbTitle.textContent      = items[lbIdx]?.dataset['title'] ?? ''
    }

    updateLbButtons()
    lbClose?.focus()
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden) return
    lightbox.classList.add('is-closing')
    lightbox.addEventListener('animationend', () => {
      lightbox.hidden = true
      lightbox.classList.remove('is-closing')
      document.body.style.overflow = ''
    }, { once: true })
  }

  function navigateLb(dir: 1 | -1) {
    if (lbAnimating) return
    const next = lbIdx + dir
    if (next < 0 || next >= items.length) return
    lbIdx = next
    setLbImage(lbIdx, dir)
  }

  function updateLbButtons() {
    if (lbPrev) lbPrev.disabled = lbIdx === 0
    if (lbNext) lbNext.disabled = lbIdx === items.length - 1
  }

  items.forEach((item, i) => item.addEventListener('click', () => openLightbox(i)))
  lbClose?.addEventListener('click', closeLightbox)
  lbPrev?.addEventListener('click', () => navigateLb(-1))
  lbNext?.addEventListener('click', () => navigateLb(1))

  lightbox?.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox()
  })

  document.addEventListener('keydown', e => {
    if (!lightbox || lightbox.hidden) return
    if (e.key === 'Escape')     closeLightbox()
    if (e.key === 'ArrowLeft')  navigateLb(-1)
    if (e.key === 'ArrowRight') navigateLb(1)
  })

  // Touch swipe - attached to lightbox itself (no lb-inner anymore)
  let lbTouchX = 0
  lightbox?.addEventListener('touchstart', e => {
    lbTouchX = e.touches[0].clientX
  }, { passive: true })
  lightbox?.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - lbTouchX
    if (Math.abs(dx) > 40) navigateLb(dx < 0 ? 1 : -1)
  }, { passive: true })

  // Init
  buildDots()
  updateDots()
  updateArrows()
}
