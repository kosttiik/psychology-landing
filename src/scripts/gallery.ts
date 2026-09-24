import { stopScroll, startScroll } from './smooth-scroll'
import { gsap } from 'gsap'
import Flip from 'gsap/Flip'

gsap.registerPlugin(Flip)

export function initGallery(): void {
  const track = document.getElementById('gallery-track')
  const prevBtn = document.querySelector<HTMLButtonElement>('.gallery__arrow--prev')
  const nextBtn = document.querySelector<HTMLButtonElement>('.gallery__arrow--next')
  const progress = document.getElementById('gallery-progress')
  const progressInput = progress?.querySelector<HTMLInputElement>('.gallery__progress-input')
  const progressFill = progress?.querySelector<HTMLElement>('.gallery__progress-fill')
  const progressThumb = progress?.querySelector<HTMLElement>('.gallery__progress-thumb')
  const progressKnob = progress?.querySelector<HTMLElement>('.gallery__progress-knob')
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
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const progressFillTo = progressFill && !reduceMotion
    ? gsap.quickTo(progressFill, 'scaleX', { duration: 0.18, ease: 'power3.out' })
    : null
  const progressThumbTo = progressThumb && !reduceMotion
    ? gsap.quickTo(progressThumb, 'left', { duration: 0.18, ease: 'power3.out' })
    : null

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

  function updateProgress() {
    if (!progressInput || !progress) return
    const maxScroll = Math.max(0, track!.scrollWidth - track!.clientWidth)
    const ratio = maxScroll ? Math.max(0, Math.min(1, track!.scrollLeft / maxScroll)) : 0
    progressInput.value = String(Math.round(ratio * 1000))
    progressInput.setAttribute('aria-valuetext', `${Math.round(ratio * 100)}% ленты`)
    if (progressFillTo) progressFillTo(ratio)
    else if (progressFill) gsap.set(progressFill, { scaleX: ratio })
    const thumbLeft = 5 + ratio * Math.max(0, progress.clientWidth - 10)
    if (progressThumbTo) progressThumbTo(thumbLeft)
    else if (progressThumb) gsap.set(progressThumb, { left: thumbLeft })
  }

  function updateArrows() {
    if (prevBtn) prevBtn.disabled = current === 0
    if (nextBtn) nextBtn.disabled = current >= getPageCount() - 1
  }

  const getThumbSrc = (item: HTMLElement): string =>
    item.querySelector<HTMLImageElement>('.gallery__item-img img')?.currentSrc
      || item.querySelector<HTMLImageElement>('.gallery__item-img img')?.src
      || ''

  // Keep decoded originals ready so the lightbox can swap without a network wait.
  const fullImageCache = new Map<string, Promise<HTMLImageElement | null>>()
  const preloadFullImage = (src: string): Promise<HTMLImageElement | null> => {
    if (!src) return Promise.resolve(null)
    const cached = fullImageCache.get(src)
    if (cached) return cached

    const image = new Image()
    image.decoding = 'async'
    const promise = new Promise<HTMLImageElement | null>(resolve => {
      image.onload = () => {
        void image.decode().then(() => resolve(image), () => resolve(image))
      }
      image.onerror = () => resolve(null)
    })
    image.src = src
    fullImageCache.set(src, promise)
    return promise
  }

  const warmAllDocuments = (): void => {
    items.forEach(item => { void preloadFullImage(item.dataset['src'] ?? '') })
  }
  const idleWindow = window as Window & {
    requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  }
  if (idleWindow.requestIdleCallback) idleWindow.requestIdleCallback(warmAllDocuments, { timeout: 2000 })
  else window.setTimeout(warmAllDocuments, 900)

  // Track navigation
  function goTo(index: number) {
    current = Math.max(0, Math.min(index, getPageCount() - 1))
    track!.scrollTo({ left: current * getItemWidth(), behavior: 'smooth' })
    updateArrows()
  }

  prevBtn?.addEventListener('click', () => goTo(current - 1))
  nextBtn?.addEventListener('click', () => goTo(current + 1))
  progressInput?.addEventListener('input', () => {
    const maxScroll = track.scrollWidth - track.clientWidth
    track.scrollLeft = Number(progressInput.value) / 1000 * maxScroll
  })

  track.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft')  goTo(current - 1)
    if (e.key === 'ArrowRight') goTo(current + 1)
  })

  let scrollTimer: ReturnType<typeof setTimeout>
  let scrollFrame = 0
  track.addEventListener('scroll', () => {
    clearTimeout(scrollTimer)
    if (progress && !progress.classList.contains('is-scrolling')) {
      progress.classList.add('is-scrolling')
      if (!reduceMotion && progressKnob) {
        gsap.to(progressKnob, { scale: 1.35, duration: 0.24, ease: 'power3.out', overwrite: true })
      }
    }
    scrollTimer = setTimeout(() => {
      progress?.classList.remove('is-scrolling')
      if (!reduceMotion && progressKnob) {
        gsap.to(progressKnob, { scale: 1, duration: 0.52, ease: 'elastic.out(1, 0.7)', overwrite: true })
      }
    }, 140)
    if (scrollFrame) return
    scrollFrame = requestAnimationFrame(() => {
      scrollFrame = 0
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
      updateProgress()
      updateArrows()
    })
  }, { passive: true })

  const ro = new ResizeObserver(() => {
    current = Math.max(0, Math.min(current, getPageCount() - 1))
    updateProgress()
    updateArrows()
  })
  ro.observe(track)

  // Two centered slots make image changes independent of image dimensions.
  let lbSlot = 0
  let lbTimeline: gsap.core.Timeline | null = null
  let lbClosing = false
  let focusOrigin: HTMLElement | null = null
  function prepareLbImage(img: HTMLImageElement, index: number): void {
    const item = items[index]
    const src = item?.dataset['src'] ?? ''
    img.dataset['pendingSrc'] = src
    img.alt = item?.dataset['title'] ?? ''
    img.src = item ? getThumbSrc(item) || src : ''
    void preloadFullImage(src).then(loaded => {
      if (loaded && img.dataset['pendingSrc'] === src) img.src = loaded.src
    })
  }

  function getActive()   { return lbImgEls[lbSlot]! }
  function getIncoming() { return lbImgEls[1 - lbSlot]! }

  function setLbImage(index: number, dir: 1 | -1 | 0): void {
    if (!lbTitle) return
    if (lbClosing) return
    const item = items[index]
    const title = item?.dataset['title'] ?? ''

    if (dir === 0) {
      prepareLbImage(getActive(), index)
      gsap.set(getActive(), { autoAlpha: 1, scale: 1, clearProps: 'filter,transform' })
      gsap.set(getIncoming(), { autoAlpha: 0, scale: 1, clearProps: 'filter,transform' })
      lbTitle.textContent = title
      gsap.set(lbTitle, { autoAlpha: 1, y: 0, clearProps: 'transform' })
      updateLbButtons()
      return
    }

    lbTimeline?.progress(1)
    const active   = getActive()
    const incoming = getIncoming()
    prepareLbImage(incoming, index)
    updateLbButtons()

    if (reduceMotion) {
      gsap.set(active, { autoAlpha: 0, scale: 1, clearProps: 'filter,transform' })
      gsap.set(incoming, { autoAlpha: 1, scale: 1, clearProps: 'filter,transform' })
      lbTitle.textContent = title
      gsap.set(lbTitle, { autoAlpha: 1, y: 0, clearProps: 'transform' })
      lbSlot = 1 - lbSlot
      return
    }

    const finish = (): void => {
      gsap.set(active, { autoAlpha: 0, scale: 1, clearProps: 'filter,transform' })
      gsap.set(incoming, { autoAlpha: 1, scale: 1, clearProps: 'filter,transform' })
      gsap.set(lbTitle, { y: 0, clearProps: 'transform' })
      lbSlot = 1 - lbSlot
      lbTimeline = null
    }

    lbTimeline = gsap.timeline({ onComplete: finish })
      .to(active, { autoAlpha: 0, scale: 0.986, filter: 'blur(2px)', duration: 0.26, ease: 'power2.in' }, 0)
      .fromTo(incoming,
        { autoAlpha: 0, scale: 1.014, filter: 'blur(3px)' },
        { autoAlpha: 1, scale: 1, filter: 'blur(0px)', duration: 0.46, ease: 'power3.out' },
        0.08,
      )
      .to(lbTitle, { autoAlpha: 0, y: 8, duration: 0.16, ease: 'power1.in' }, 0)
      .call(() => { lbTitle.textContent = title }, [], 0.17)
      .fromTo(lbTitle,
        { autoAlpha: 0, y: 8 },
        { autoAlpha: 1, y: 0, duration: 0.27, ease: 'power3.out' },
        0.19,
      )
  }

  function openLightbox(index: number) {
    if (!lightbox) return
    lbTimeline?.progress(1)
    lbIdx    = index
    lbSlot   = 0
    lbClosing = false
    focusOrigin = items[index] ?? null
    lightbox.hidden = false
    stopScroll()

    const active = getActive()
    gsap.set(active, { autoAlpha: 1, scale: 1, clearProps: 'filter,transform' })
    prepareLbImage(active, lbIdx)
    const incoming = getIncoming()
    incoming.src = ''
    gsap.set(incoming, { autoAlpha: 0, scale: 1, clearProps: 'filter,transform' })

    if (lbTitle) {
      lbTitle.textContent = items[lbIdx]?.dataset['title'] ?? ''
      gsap.set(lbTitle, { autoAlpha: 0, y: 10 })
    }

    updateLbButtons()

    const origin = items[index]?.querySelector<HTMLImageElement>('.gallery__document img')
    if (!reduceMotion && origin) {
      Flip.fit(active, origin, { scale: true })
      const state = Flip.getState(active)
      gsap.set(active, { clearProps: 'transform' })
      const duration = 0.68
      gsap.set(lightbox, { autoAlpha: 0 })
      lbTimeline = Flip.from(state, {
        duration,
        ease: 'power3.inOut',
        scale: true,
      })
      lbTimeline.fromTo(lightbox,
        { autoAlpha: 0 },
        { autoAlpha: 1, duration: 0.46, ease: 'power2.out' },
        0,
      )
      if (lbTitle) lbTimeline.fromTo(lbTitle,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.36, ease: 'power3.out' },
        0.25,
      )
      lbTimeline.eventCallback('onComplete', () => {
        gsap.set(active, { clearProps: 'transform' })
        lbTimeline = null
      })
    } else {
      gsap.set(lightbox, { autoAlpha: 1 })
      if (lbTitle) gsap.set(lbTitle, { autoAlpha: 1, y: 0, clearProps: 'transform' })
    }

    lbClose?.focus()
  }

  function closeLightbox() {
    if (!lightbox || lightbox.hidden || lbClosing) return
    lbClosing = true
    lbTimeline?.progress(1)
    const active = getActive()
    const origin = items[lbIdx]?.querySelector<HTMLImageElement>('.gallery__document img')
    const finish = (): void => {
      lightbox.hidden = true
      gsap.set(lightbox, { clearProps: 'opacity,visibility' })
      gsap.set(lbImgEls, { clearProps: 'transform,opacity,visibility,filter' })
      if (lbTitle) gsap.set(lbTitle, { clearProps: 'transform,opacity,visibility' })
      startScroll()
      focusOrigin?.focus()
      focusOrigin = null
      lbTimeline = null
      lbClosing = false
    }

    if (reduceMotion || !origin) {
      finish()
      return
    }

    const state = Flip.getState(active)
    Flip.fit(active, origin, { scale: true })
    lbTimeline = Flip.from(state, { duration: 0.58, ease: 'power3.inOut', scale: true })
    lbTimeline.to(lightbox, { autoAlpha: 0, duration: 0.52, ease: 'power2.in' }, 0)
    lbTimeline.eventCallback('onComplete', finish)
  }

  function navigateLb(dir: 1 | -1) {
    if (lbClosing) return
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

  // A multi-touch gesture belongs to the browser so pinch-zoom can work.
  let lbTouchX: number | null = null
  lightbox?.addEventListener('touchstart', e => {
    lbTouchX = e.touches.length === 1 ? e.touches[0].clientX : null
  }, { passive: true })
  lightbox?.addEventListener('touchend', e => {
    if (lbTouchX === null || e.touches.length !== 0 || e.changedTouches.length !== 1) {
      lbTouchX = null
      return
    }
    const dx = e.changedTouches[0].clientX - lbTouchX
    lbTouchX = null
    if (Math.abs(dx) > 40) navigateLb(dx < 0 ? 1 : -1)
  }, { passive: true })
  lightbox?.addEventListener('touchcancel', () => { lbTouchX = null }, { passive: true })

  // Init
  updateProgress()
  updateArrows()
}
