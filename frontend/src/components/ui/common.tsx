import { AlertCircle, Inbox, LoaderCircle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './button'

export function Badge({ children, severity = 'info' }: { children: ReactNode; severity?: string }) {
  return <span className={`badge badge-${severity}`}>{children}</span>
}
export function Loading({ text = 'Loading workspace…' }: { text?: string }) {
  return (
    <div className="state-box" role="status">
      <LoaderCircle className="spin" size={24} />
      <p>{text}</p>
    </div>
  )
}
export function ErrorState({ message, retry }: { message: string; retry?: () => void }) {
  return (
    <div className="state-box error-box" role="alert">
      <AlertCircle size={24} />
      <p>{message}</p>
      {retry && (
        <Button variant="outline" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  )
}
export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="state-box">
      <Inbox size={28} />
      <h3>{title}</h3>
      {children}
    </div>
  )
}
