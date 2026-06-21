// On Russian mobile networks the t.me domain is often throttled or blocked,
// while the tg:// deep link (an OS-level intent that never touches t.me) still
// opens the installed app. So on mobile we route Telegram clicks through
// tg://resolve and fall back to the https t.me URL only if the app doesn't take
// over the screen — i.e. it isn't installed.
export function initTelegram(): void {
  const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent)
  if (!isMobile) return

  const links = document.querySelectorAll<HTMLAnchorElement>('a[href*="t.me/"]')

  links.forEach((link) => {
    const domain = new URL(link.href).pathname.replace(/^\/+|\/+$/g, '')
    if (!domain) return

    link.addEventListener('click', (e) => {
      e.preventDefault()

      let switched = false
      const markSwitched = (): void => {
        switched = true
      }
      document.addEventListener('visibilitychange', markSwitched)
      window.addEventListener('pagehide', markSwitched)

      // Hand off to the installed app — bypasses any t.me domain blocking.
      window.location.href = `tg://resolve?domain=${domain}`

      // Still here after a moment → the app isn't installed: fall back to the
      // web URL so the user at least lands on a working page.
      window.setTimeout(() => {
        document.removeEventListener('visibilitychange', markSwitched)
        window.removeEventListener('pagehide', markSwitched)
        if (!switched) window.location.href = link.href
      }, 1200)
    })
  })
}
