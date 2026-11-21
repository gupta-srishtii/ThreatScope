import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Check, MessageSquarePlus, ShieldAlert } from 'lucide-react'
import { Dialog } from './ui/dialog'
import { Button } from './ui/button'
import { Badge, ErrorState, Loading } from './ui/common'
import { EventInspector } from './EventInspector'
import { useWorkspace } from '../lib/workspace'
import { useResource } from '../lib/use-resource'
import type { Alert, Event, EventPage, Note } from '../lib/types'
import { date, errorMessage, time } from '../lib/utils'

export function AlertInvestigation({ alert, close }: { alert: Alert; close: () => void }) {
  const { api, selected, invalidate } = useWorkspace()
  const path = `/api/datasets/${selected!.id}/alerts/${alert.id}`
  const [status, setStatus] = useState(alert.status)
  const [savedStatus, setSavedStatus] = useState(alert.status)
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [event, setEvent] = useState<Event | null>(null)
  const resource = useResource(async signal => {
    const [notes, evidence] = await Promise.all([api.request<Note[]>(path + '/notes', { signal }), api.request<EventPage>(path + '/events', { signal })])
    return { notes, evidence }
  }, [api, path])
  async function saveNote() {
    setBusy(true); setError(''); setNotice('')
    try { await api.request(path + '/notes', { method: 'POST', body: JSON.stringify({ body }) }); setBody(''); resource.reload(); setNotice('Investigation note saved.') }
    catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  async function saveStatus() {
    setBusy(true); setError(''); setNotice('')
    try { await api.request(path, { method: 'PATCH', body: JSON.stringify({ status }) }); setSavedStatus(status); invalidate(); setNotice('Investigation status updated.') }
    catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  return <><Dialog open onOpenChange={open => { if (!open) close() }} title={alert.title} description="Review the evidence, record context, and decide the next investigation step." wide>
    <div className="detail-meta"><Badge severity={alert.severity}>{alert.severity}</Badge><span className="mono">{alert.rule_id}</span><Badge>{savedStatus}</Badge><span>{date(alert.timestamp)} · {time(alert.timestamp)} UTC</span></div>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="explanation-box"><ShieldAlert size={21} /><div><h3>Why this was detected</h3><p>{alert.explanation}</p></div></motion.div>
    <dl className="evidence-stats">{Object.entries(alert.evidence).map(([key, value]) => <div key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{value}</dd></div>)}</dl>
    <div className="recommendation"><h3>Recommended investigation</h3><p>{alert.recommendation}</p></div>
    <div className="status-controls"><label className="field">Investigation status<select value={status} onChange={e => setStatus(e.target.value as Alert['status'])}><option value="open">Open</option><option value="investigating">Investigating</option><option value="resolved">Resolved</option></select></label><Button variant="outline" onClick={saveStatus} disabled={busy || status === savedStatus}>Update status</Button></div>
    {resource.loading ? <Loading text="Loading investigation evidence…" /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : <>
      <h3>Supporting events <span className="muted">({resource.data!.evidence.total})</span></h3>
      <div className="table-scroll evidence-table"><table><caption className="sr-only">Events supporting this detection</caption><thead><tr><th scope="col">Time UTC</th><th scope="col">User</th><th scope="col">Action / outcome</th><th scope="col">Details</th></tr></thead><tbody>{resource.data!.evidence.items.map(e => <tr key={e.id}><td className="mono">{time(e.timestamp)}</td><td>{e.user}</td><td>{e.action.replaceAll('_', ' ')} · {e.outcome}</td><td><Button variant="ghost" size="sm" onClick={() => setEvent(e)} aria-label={`Inspect event ${e.id}`}>Inspect</Button></td></tr>)}</tbody></table></div>
      {resource.data!.evidence.total > 100 && <p className="muted">Showing the first 100 evidence events. Export the full dataset for all referenced IDs.</p>}
      <div className="notes-heading"><h3>Investigation notes</h3><span>{resource.data!.notes.length} notes</span></div><div className="note-list"><AnimatePresence>{resource.data!.notes.map(note => <motion.article key={note.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="note"><span className="mono">{date(note.created_at)} · {time(note.created_at)} UTC</span><p>{note.body}</p></motion.article>)}</AnimatePresence>{!resource.data!.notes.length && <p className="muted">No notes yet. Add verified context for the next analyst.</p>}</div>
    </>}
    <form onSubmit={e => { e.preventDefault(); void saveNote() }}><label className="field">Add investigation note<textarea value={body} onChange={e => setBody(e.target.value)} maxLength={4000} rows={3} placeholder="Record findings, verification steps, or next actions…" /></label><Button type="submit" disabled={busy || !body.trim()}><MessageSquarePlus size={16} />{busy ? 'Saving…' : 'Save note'}</Button></form>
    {error && <p role="alert" className="form-error">{error}</p>}<p className="save-notice" role="status">{notice && <><Check size={14} />{notice}</>}</p>
  </Dialog><EventInspector event={event} close={() => setEvent(null)} /></>
}
