import { stopScroll, startScroll } from './smooth-scroll'

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
    const img = item.querySelector<HTMLImageElement>('img')
    if (!img) return
    img.addEventListener('contextmenu', e => e.preventDefault())
    img.addEventListener('dragstart', e => e.preventDefault())

    // Keep the warm mat visible while a thumbnail decodes, then reveal the
    // paper once. This avoids the blank-to-image flash when a card enters the
    // horizontal viewport on a slower connection.
    const reveal = () => img.classList.add('is-loaded')
    if (img.complete) reveal()
    else {
      img.addEventListener('load', reveal, { once: true })
      img.addEventListener('error', reveal, { once: true })
    }
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
    const style = getComputedStyle(track)
    const horizontalPadding = parseFloat(style.paddingLeft || '0')
      + parseFloat(style.paddingRight || '0')
    const visibleWidth = Math.max(0, track.clientWidth - horizontalPadding)
    const gap = parseFloat(style.columnGap || style.gap || '24')
    return iw > 0 ? Math.max(1, Math.floor((visibleWidth + gap) / iw)) : 1
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

  const getThumbSrc = (item: HTMLElement): string =>
    item.querySelector<HTMLImageElement>('.gallery__item-img img')?.currentSrc
      || item.querySelector<HTMLImageElement>('.gallery__item-img img')?.src
      || ''

  // Full-size documents are small enough to warm progressively. Keeping the
  // promises in a cache means opening the lightbox or moving to the next
  // document never starts a second request for the same file.
  const fullImageCache = new Map<string, Promise<boolean>>()
  const preloadFullImage = (src: string): Promise<boolean> => {
    if (!src) return Promise.resolve(false)
    const cached = fullImageCache.get(src)
    if (cached) return cached

    const promise = new Promise<boolean>(resolve => {
      const image = new Image()
      image.decoding = 'async'
      image.onload = () => resolve(true)
      image.onerror = () => resolve(false)
      image.src = src
    })
    fullImageCache.set(src, promise)
    return promise
  }

  const warmAround = (index: number): void => {
    ;[index - 1, index, index + 1]
      .filter(i => i >= 0 && i < items.length)
      .forEach(i => { void preloadFullImage(items[i]?.dataset['src'] ?? '') })
  }

  // Start preparing the first page after the initial screen has settled. Hover
  // and focus warm the adjacent documents too, so a user can move through the
  // gallery without waiting for a cold full-size request.
  window.setTimeout(() => warmAround(0), 900)
  items.forEach((item, i) => {
    item.addEventListener('pointerenter', () => warmAround(i))
    item.addEventListener('focus', () => warmAround(i))
  })

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

  // Put the ready thumbnail into a slot immediately, then upgrade it when the
  // original finishes. The pending-src guard prevents a late response from an
  // older navigation from replacing a newer document.
  function showThumbnailUntilReady(img: HTMLImageElement, src: string, fallbackSrc: string): void {
    img.dataset['pendingSrc'] = src
    if (fallbackSrc && img.getAttribute('src') !== fallbackSrc) img.src = fallbackSrc
    void preloadFullImage(src).then(loaded => {
      if (loaded && img.dataset['pendingSrc'] === src && img.getAttribute('src') !== src) {
        img.src = src
      }
    })
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

    // Park the idle slot off-screen on the entry side *before* loading, so the
    // image it held two steps ago is never visible while the new one decodes.
    applyInstant(incoming, dir > 0 ? T_OFF_RIGHT : T_OFF_LEFT)
    incoming.alt = title

    // Fade title out for feedback; the current image stays put until it's ready.
    if (lbTitle) {
      lbTitle.style.transition = 'opacity 0.15s ease'
      lbTitle.style.opacity    = '0'
    }

    // The thumbnail is ready for an immediate transition; the full document
    // upgrades in-place when its background request completes.
    showThumbnailUntilReady(incoming, src, getThumbSrc(item))

    // Double rAF so the browser paints the parked position before sliding.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (!lightbox || lightbox.hidden) {
          lbAnimating = false
          return
        }

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
    stopScroll()

    // Active image - centered, no transition
    const active = getActive()
    applyInstant(active, T_CENTER)
    const activeItem = items[lbIdx]
    const activeSrc = activeItem?.dataset['src'] ?? ''
    active.src = activeItem ? getThumbSrc(activeItem) || activeSrc : ''
    active.alt = items[lbIdx]?.dataset['title'] ?? ''
    active.style.zIndex = '1'

    // Show the already-available thumbnail immediately, then replace it with
    // the decoded original without flashing an empty lightbox frame.
    if (activeItem) showThumbnailUntilReady(active, activeSrc, getThumbSrc(activeItem))

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
      startScroll()
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
