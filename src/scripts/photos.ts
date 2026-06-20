// Adaptive photo layout.
//
// The page ships markup for up to three portraits (public/maria-1..3.{webp,jpg}),
// but only some may exist yet (e.g. before a full photoshoot). On load we probe
// which of them actually resolve, drop the markup for the missing ones, and tag
// the hero and about photo groups with `data-photos="1|2|3"` so the SCSS can
// collapse to a balanced one- or two-photo arrangement. Mirrors the OG
// generator, which likewise builds from whatever maria-* files are present.
//
// This is awaited before the body is revealed (see the body opacity gate in
// _animations.scss + main.ts), so the layout is settled before first paint and
// a missing file never flashes a broken image.

// Base names; each portrait ships as a WebP (preferred) + JPEG fallback.
const CANDIDATES = ['maria-1', 'maria-2', 'maria-3'] as const

// Hero polaroid captions per available-photo count. With three cards the info
// is spread across them; with fewer, it's rolled up onto the survivors so a
// single photo still reads "Мария Попова / психотерапевт · КПТ · АКТ · СФТ"
// rather than a bare "Мария". A `\n` splits a card's caption into a handwritten
// name line and a small credential sub-line.
const HERO_LABELS: Record<number, string[]> = {
  1: ['Мария Попова\nпсихотерапевт · КПТ · АКТ · СФТ'],
  2: ['Мария Попова', 'Психотерапевт\nКПТ · АКТ · СФТ'],
  3: ['Мария', 'Психотерапевт', 'КПТ · АКТ · СФТ'],
}

// Resolve true if the JPEG (the guaranteed fallback) loads, false on a real
// error. A slow-but-present image shouldn't be dropped, so anything that hasn't
// errored shortly is assumed present — only outright failures (404) count.
function probe(name: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image()
    let done = false
    const settle = (ok: boolean): void => {
      if (done) return
      done = true
      resolve(ok)
    }
    img.onload = () => settle(true)
    img.onerror = () => settle(false)
    img.src = `/${name}.jpg`
    window.setTimeout(() => settle(true), 1200)
  })
}

// Point a slot's <picture> (WebP source + JPEG <img>) at a given portrait.
function setSlot(slot: Element, name: string): void {
  const source = slot.querySelector<HTMLSourceElement>('source[type="image/webp"]')
  const img = slot.querySelector('img')
  if (source) source.srcset = `/${name}.webp`
  if (img) img.src = `/${name}.jpg`
}

// Render a caption: first line is the handwritten name, anything after a `\n`
// becomes a small uppercase credential sub-line.
function setLabel(el: Element, text: string): void {
  const [main, ...rest] = text.split('\n')
  el.textContent = main
  if (rest.length) {
    const sub = document.createElement('span')
    sub.className = 'hero__polaroid-sub'
    sub.textContent = rest.join(' ')
    el.appendChild(sub)
  }
}

export async function initPhotos(): Promise<void> {
  const hero = document.querySelector<HTMLElement>('.hero__photos')
  const about = document.querySelector<HTMLElement>('.about__photos')

  const present = await Promise.all(CANDIDATES.map(probe))
  const available = CANDIDATES.filter((_, i) => present[i])

  // All probes failed (offline / blocked) — leave the default 3-photo markup
  // untouched rather than blanking the section.
  if (available.length === 0) return

  if (hero) layoutHero(hero, available)
  if (about) layoutAbout(about, available)
}

function layoutHero(hero: HTMLElement, available: readonly string[]): void {
  const cards = Array.from(hero.querySelectorAll<HTMLElement>('.hero__polaroid'))
  const count = Math.min(available.length, cards.length)
  const labels = HERO_LABELS[count] ?? []

  cards.forEach((card, i) => {
    const name = available[i]
    if (!name) {
      card.remove()
      return
    }
    setSlot(card, name)
    const label = card.querySelector('.hero__polaroid-label')
    if (label && labels[i] !== undefined) setLabel(label, labels[i])
  })
  hero.dataset.photos = String(count)
}

function layoutAbout(about: HTMLElement, available: readonly string[]): void {
  const main = about.querySelector('.about__photo-main')
  if (main) setSlot(main, available[0])

  // First portrait is the main photo; the rest fill the secondary grid.
  const smalls = Array.from(
    about.querySelectorAll<HTMLElement>('.about__photo-small')
  )
  smalls.forEach((small, i) => {
    const name = available[i + 1]
    if (!name) {
      small.remove()
      return
    }
    setSlot(small, name)
  })

  // No secondary photos left → drop the now-empty grid wrapper entirely.
  const wrap = about.querySelector<HTMLElement>('.about__photo-small-wrap')
  if (wrap && wrap.querySelectorAll('.about__photo-small').length === 0) {
    wrap.remove()
  }

  about.dataset.photos = String(Math.min(available.length, 1 + smalls.length))
}
