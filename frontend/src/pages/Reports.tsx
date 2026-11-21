import { useState } from 'react'
import { Check, Download, FileJson, FileSpreadsheet, ShieldCheck } from 'lucide-react'
import { useWorkspace } from '../lib/workspace'
import { useResource } from '../lib/use-resource'
import type { Metrics } from '../lib/types'
import { date, errorMessage, number } from '../lib/utils'
import { Badge, ErrorState, Loading } from '../components/ui/common'
import { Button } from '../components/ui/button'

export function Reports() {
  const { api, selected, revision } = useWorkspace()
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const resource = useResource(signal => api.request<Metrics>(`/api/datasets/${selected!.id}/metrics`, { signal }), [api, selected?.id, revision])
  async function download(format: 'json' | 'csv') {
    setBusy(format); setError(''); setNotice('')
    try { await api.download(selected!.id, format); setNotice(`${format.toUpperCase()} report downloaded.`) }
    catch (e) { setError(errorMessage(e)) } finally { setBusy('') }
  }
  return <section className="panel reports-panel"><div className="panel-header"><div><h2>Evidence you can take with you.</h2><p>Export a reviewable security snapshot, with clear provenance and limitations.</p></div><ShieldCheck size={25} className="teal-text" /></div>{resource.loading ? <Loading /> : resource.error ? <ErrorState message={resource.error} retry={resource.reload} /> : <div className="reports-body"><div className="report-preview"><div><span className="eyebrow">Security analysis report</span><h3>{selected!.name}</h3><Badge severity={selected!.source === 'synthetic' ? 'synthetic' : 'info'}>{selected!.source} dataset</Badge></div><dl><div><dt>Analysis date</dt><dd>{date(resource.data!.window_start)}</dd></div><div><dt>Normalized events</dt><dd>{number(resource.data!.total_events)}</dd></div><div><dt>Rule detections</dt><dd>{resource.data!.total_alerts}</dd></div><div><dt>Open investigations</dt><dd>{resource.data!.open_alerts}</dd></div></dl><p>Snapshot analysis · UTC timestamps · No live collection</p></div>
    <div className="report-options"><article><FileJson size={27} /><h3>Investigation report</h3><p>Dataset provenance, metrics, every rule finding and evidence reference, triage status, notes, and limitations.</p><span className="report-format">JSON · Structured evidence</span><Button onClick={() => download('json')} disabled={!!busy}><Download size={16} />{busy === 'json' ? 'Preparing…' : 'Download JSON report'}</Button></article><article><FileSpreadsheet size={27} /><h3>Normalized events</h3><p>All events in the selected dataset, ready for offline analysis. Spreadsheet formula protection is applied to text fields.</p><span className="report-format">CSV · Complete event dataset</span><Button variant="outline" onClick={() => download('csv')} disabled={!!busy}><Download size={16} />{busy === 'csv' ? 'Preparing…' : 'Download event CSV'}</Button></article></div>
    <div className="notice"><ShieldCheck size={19} /><p>Reports contain the data you imported and the notes you recorded. Export and share them only within your authorized workspace. Anomaly findings remain investigation leads.</p></div>{error && <p className="form-error" role="alert">{error}</p>}<p className="save-notice" role="status">{notice && <><Check size={15} />{notice}</>}</p></div>}</section>
}
