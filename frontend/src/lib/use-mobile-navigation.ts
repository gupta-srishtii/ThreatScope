import { useEffect, useState, type RefObject } from 'react'

export function useMobileNavigation(
  open: boolean,
  close: () => void,
  sidebar: RefObject<HTMLElement | null>,
) {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 900px)').matches)
  useEffect(() => {
    const media = window.matchMedia('(max-width: 900px)')
    const update = () => setNarrow(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useEffect(() => {
    if (!open || !narrow) return
    const elements = () => [
      ...(sidebar.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') || []),
    ]
    elements()[0]?.focus()
    const trap = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        close()
      }
      if (event.key === 'Tab') {
        const items = elements(),
          first = items[0],
          last = items.at(-1)
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault()
          last?.focus()
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault()
          first?.focus()
        }
      }
    }
    document.addEventListener('keydown', trap)
    return () => {
      document.removeEventListener('keydown', trap)
      document.querySelector<HTMLElement>('[aria-controls="workspace-sidebar"]')?.focus()
    }
  }, [open, narrow, close, sidebar])
  return narrow
}
