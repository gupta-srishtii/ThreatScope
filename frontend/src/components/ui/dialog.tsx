import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useRef } from 'react'
import { Button } from './button'

export function Dialog({ open, onOpenChange, title, description, children, wide = false }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; description: string; children: ReactNode; wide?: boolean
}) {
  const previousFocus = useRef<HTMLElement | null>(null)
  const wasOpen = useRef(false)
  if (open && !wasOpen.current) previousFocus.current = document.activeElement as HTMLElement
  wasOpen.current = open
  function restoreFocus(event: Event) {
    event.preventDefault()
    const previous = previousFocus.current
    const label = previous?.getAttribute('aria-label')
    const replacement = label ? [...document.querySelectorAll<HTMLElement>('[aria-label]')].find(node => node.getAttribute('aria-label') === label) : null
    const target = previous?.isConnected ? previous : replacement
    target?.focus()
  }
  return <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="dialog-overlay" />
      <DialogPrimitive.Content className={`dialog-content ${wide ? 'dialog-wide' : ''}`}
        onCloseAutoFocus={restoreFocus}>
        <div className="dialog-header"><div><DialogPrimitive.Title>{title}</DialogPrimitive.Title>
          <DialogPrimitive.Description>{description}</DialogPrimitive.Description></div>
          <DialogPrimitive.Close asChild><Button variant="ghost" size="icon" aria-label="Close dialog"><X size={19} /></Button></DialogPrimitive.Close>
        </div>{children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  </DialogPrimitive.Root>
}
