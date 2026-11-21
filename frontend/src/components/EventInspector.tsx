import { Server, UserRound } from 'lucide-react'
import { Dialog } from './ui/dialog'
import { Badge } from './ui/common'
import type { Event } from '../lib/types'
import { date, number, time } from '../lib/utils'

export function EventInspector({ event, close }: { event: Event | null; close: () => void }) {
  return <Dialog open={!!event} onOpenChange={open => { if (!open) close() }} title="Event investigation" description="Normalized event data. Content is displayed as text and is never executed." wide>
    {event && <><div className="detail-meta"><Badge severity={event.severity}>{event.severity}</Badge><span className="mono">{event.id}</span><span>{date(event.timestamp)} · {time(event.timestamp)} UTC</span></div><div className="event-identity"><span><UserRound size={17} />{event.user}</span><span><Server size={17} />{event.host}</span></div>
      <dl className="detail-grid">{Object.entries({ 'Source address': event.source_ip, Action: event.action.replaceAll('_', ' '), Outcome: event.outcome, 'Bytes sent': number(event.bytes_sent), Timestamp: event.timestamp, 'Synthetic label': event.label || 'Unlabeled' }).map(([key, value]) => <div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl>
      <h3>Event message</h3><p className="event-message">{event.message || 'No message provided.'}</p><details className="raw-event"><summary>View normalized JSON</summary><pre>{JSON.stringify(event, null, 2)}</pre></details></>}
  </Dialog>
}
