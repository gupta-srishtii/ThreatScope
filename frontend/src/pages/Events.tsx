import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Search, SlidersHorizontal } from 'lucide-react'
import { useWorkspace } from '../lib/workspace'
import { useResource } from '../lib/use-resource'
import type { Event, EventPage } from '../lib/types'
import { date, number, time } from '../lib/utils'
import { Badge, Empty, ErrorState, Loading } from '../components/ui/common'
import { Button } from '../components/ui/button'
import { EventInspector } from '../components/EventInspector'

export function Events() {
  const { api, selected } = useWorkspace()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [severity, setSeverity] = useState('')
  const [outcome, setOutcome] = useState('')
  const [action, setAction] = useState('')
  const [page, setPage] = useState(0)
  const [active, setActive] = useState<Event | null>(null)
  useEffect(() => { const id = setTimeout(() => { setDebounced(query); setPage(0) }, 250); return () => clearTimeout(id) }, [query])
  const params = new URLSearchParams({ q: debounced, offset: String(page * 25), limit: '25' })
  if (severity) params.set('severity', severity)
  if (outcome) params.set('outcome', outcome)
  if (action) params.set('action', action)
  const resource = useResource(signal => api.request<EventPage>(`/api/datasets/${selected!.id}/events?${params}`, { signal }), [api, selected?.id, params.toString()])
  const data = resource.data
  return <><section className="panel"><div className="panel-header"><div><h2>Normalized event stream</h2><p>Search the selected snapshot. Select an event to inspect its full context.</p></div><SlidersHorizontal size={19} className="muted" /></div>
    <div className="filter-bar event-filters"><div className="search-field"><Search size={17} /><label className="sr-only" htmlFor="event-search">Search events</label><input id="event-search" value={query} maxLength={120} onChange={e => setQuery(e.target.value)} placeholder="Search user, IP, host or message…" /></div><label className="sr-only" htmlFor="severity-filter">Event severity</label><select id="severity-filter" value={severity} onChange={e => { setSeverity(e.target.value); setPage(0) }}><option value="">All severities</option>{['critical', 'high', 'medium', 'low', 'info'].map(s => <option value={s} key={s}>{s}</option>)}</select><label className="sr-only" htmlFor="outcome-filter">Event outcome</label><select id="outcome-filter" value={outcome} onChange={e => { setOutcome(e.target.value); setPage(0) }}><option value="">All outcomes</option>{['success', 'failure', 'allowed', 'blocked'].map(s => <option value={s} key={s}>{s}</option>)}</select></div>
    <div className="event-action-tabs" aria-label="Event action filter">{[['', 'All events'], ['login', 'Authentication'], ['file_access', 'File access'], ['network_connection', 'Network'], ['process_start', 'Processes']].map(([value, label]) => <button aria-pressed={action === value} key={value} onClick={() => { setAction(value); setPage(0) }}>{label}</button>)}</div>
    {resource.loading ? <Loading text="Querying normalized events…" /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : !data?.items.length ? <Empty title="No matching events"><p>Try a different search or filter.</p></Empty> : <div className="table-scroll event-table"><table><caption className="sr-only">Security events in the selected dataset</caption><thead><tr><th scope="col">Timestamp / UTC</th><th scope="col">Event</th><th scope="col">User / host</th><th scope="col">Source address</th><th scope="col">Outcome</th><th scope="col">Severity</th><th scope="col">Details</th></tr></thead><tbody>{data.items.map(event => <tr key={event.id}><td className="mono">{time(event.timestamp)}<span className="cell-secondary">{date(event.timestamp)}</span></td><td><span className="event-action">{event.action.replaceAll('_', ' ')}</span><span className="cell-secondary mono">{event.id}</span></td><td>{event.user}<span className="cell-secondary">{event.host}</span></td><td className="mono">{event.source_ip}</td><td><span className={`outcome outcome-${event.outcome}`}>{event.outcome}</span></td><td><Badge severity={event.severity}>{event.severity}</Badge></td><td><Button variant="ghost" size="sm" onClick={() => setActive(event)} aria-label={`Inspect event ${event.id}`}>Inspect</Button></td></tr>)}</tbody></table></div>}
    <div className="pagination"><span role="status" aria-label="Event query results">{data ? `${number(data.total)} matching events · ${data.total ? page * 25 + 1 : 0}–${Math.min((page + 1) * 25, data.total)} shown` : 'Loading results…'}</span><div><Button variant="outline" size="icon" aria-label="Previous page" disabled={page === 0 || resource.loading} onClick={() => setPage(v => v - 1)}><ChevronLeft size={17} /></Button><span>Page {page + 1}</span><Button variant="outline" size="icon" aria-label="Next page" disabled={!data || (page + 1) * 25 >= data.total || resource.loading} onClick={() => setPage(v => v + 1)}><ChevronRight size={17} /></Button></div></div>
  </section><EventInspector event={active} close={() => setActive(null)} /></>
}
