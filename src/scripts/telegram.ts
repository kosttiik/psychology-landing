// In Russia the t.me domain is often throttled or blocked on both mobile and
// desktop networks, while the tg:// deep link (an OS-level intent that never
// touches t.me) still opens the installed app. So every Telegram click is
// routed through tg://resolve, falling back to the https t.me URL only if no
// app takes over — i.e. it isn't installed.
export function initTelegram(): void {
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
      // The app taking over backgrounds the tab (mobile) or steals window focus
      // (desktop) — either signal means the deep link was handled.
      document.addEventListener('visibilitychange', markSwitched)
      window.addEventListener('pagehide', markSwitched)
      window.addEventListener('blur', markSwitched)

      // Hand off to the installed app — bypasses any t.me domain blocking.
      window.location.href = `tg://resolve?domain=${domain}`

      // Still focused here after a moment → no app caught the link: fall back to
      // the web URL. hasFocus() also guards against a missed blur/visibility event.
      window.setTimeout(() => {
        document.removeEventListener('visibilitychange', markSwitched)
        window.removeEventListener('pagehide', markSwitched)
        window.removeEventListener('blur', markSwitched)
        if (!switched && document.hasFocus()) window.location.href = link.href
      }, 1500)
    })
  })
}
