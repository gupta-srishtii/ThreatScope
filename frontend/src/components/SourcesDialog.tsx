import { useState } from 'react'
import { Blocks, Check, Database, FileJson, LoaderCircle, Trash2, UploadCloud } from 'lucide-react'
import { Dialog } from './ui/dialog'
import { Button } from './ui/button'
import { Badge } from './ui/common'
import { useWorkspace } from '../lib/workspace'
import type { Dataset } from '../lib/types'
import { errorMessage, number } from '../lib/utils'
import { validateUpload } from '../lib/upload'

const scenarios = [
  ['mixed', 'Command center', 'A complete investigation with all four rule types.'],
  ['authentication', 'Authentication sequence', 'Repeated failures followed by a successful login.'],
  ['burst', 'Activity burst', 'Concentrated file access from a single source.'],
  ['off_hours', 'After hours', 'A successful login outside example working hours.'],
  ['baseline', 'Quiet baseline', 'Benign business activity to compare detections.'],
]
export function SourcesDialog({ open, onOpenChange, onLoaded }: { open: boolean; onOpenChange: (open: boolean) => void; onLoaded: () => void }) {
  const { api, refresh, datasets } = useWorkspace()
  const [tab, setTab] = useState('demo')
  const [scenario, setScenario] = useState('mixed')
  const [seed, setSeed] = useState(42)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState('')
  function chooseFile(next: File | null) {
    setFile(null); setError('')
    if (next) { const issue = validateUpload(next); if (issue) setError(issue); else setFile(next) }
  }
  async function load() {
    setBusy(true); setError('')
    try {
      let row: Dataset
      if (tab === 'demo') row = await api.request('/api/datasets/scenario', { method: 'POST', body: JSON.stringify({ scenario, seed }) })
      else {
        if (!file || validateUpload(file)) throw new Error('Choose a valid CSV or JSON file.')
        const body = new FormData(); body.append('file', file)
        row = await api.request('/api/datasets/upload', { method: 'POST', body })
      }
      await refresh(row.id); setFile(null); onOpenChange(false); onLoaded()
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  async function remove(id: string) {
    setBusy(true); setError('')
    try { await api.request(`/api/datasets/${id}`, { method: 'DELETE' }); await refresh(); setRemoving('') }
    catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value) }} title="Connect security data" description="Analyze synthetic scenarios or authorized local logs. Uploaded files are validated as data." wide>
    <div className="source-tabs" aria-label="Data source mode">{[['demo', 'Demo scenarios'], ['upload', 'Upload file'], ['manage', 'Manage datasets']].map(([id, label]) => <button key={id} aria-pressed={tab === id} disabled={busy} onClick={() => { setTab(id); setError('') }}>{label}</button>)}</div>
    {tab === 'demo' ? <><div className="scenario-list">{scenarios.map(([id, title, description]) => <label className={`scenario-option ${scenario === id ? 'scenario-selected' : ''}`} key={id}><input type="radio" name="scenario" value={id} checked={scenario === id} onChange={() => setScenario(id)} disabled={busy} /><Blocks size={20} /><span><strong>{title}</strong><p>{description}</p></span>{scenario === id && <Check size={16} />}</label>)}</div><div className="source-action"><label className="field seed-field">Reproducible seed<input type="number" min={0} max={1000000} value={seed} onChange={e => setSeed(Number(e.target.value))} disabled={busy} /></label><Button onClick={load} disabled={busy || !Number.isInteger(seed) || seed < 0 || seed > 1000000}>{busy ? <LoaderCircle size={16} className="spin" /> : <Blocks size={16} />}{busy ? 'Preparing scenario…' : 'Load scenario'}</Button></div></> : tab === 'upload' ? <>
      <div className="upload-area" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy) chooseFile(e.dataTransfer.files[0] || null) }}><UploadCloud size={35} /><h3>Bring your event data</h3><p>Drop a file here, or choose from your device.</p><label className="field">Event file<input type="file" accept=".csv,.json" disabled={busy} onChange={e => chooseFile(e.target.files?.[0] || null)} /></label><span>CSV or JSON · UTF-8 · Up to 2 MiB / 10,000 events</span></div>
      <div className="schema-help"><FileJson size={18} /><div><strong>Normalized events required</strong><p>Required: id, timestamp (with timezone), source_ip, user, host, action, outcome. Optional: severity, bytes_sent, message, label. See repository samples for a template.</p></div></div>
      {file && <p className="file-ready"><Check size={16} />{file.name} · {number(file.size)} bytes</p>}<Button onClick={load} disabled={busy || !file}>{busy ? <LoaderCircle size={16} className="spin" /> : <Database size={16} />}{busy ? 'Validating and analyzing…' : 'Validate and import'}</Button>
    </> : <div className="dataset-management">{datasets.length ? datasets.map(row => <div className="managed-dataset" key={row.id}><Database size={20} /><div><strong>{row.name}</strong><span>{number(row.event_count)} events · <Badge severity={row.source === 'synthetic' ? 'synthetic' : 'info'}>{row.source}</Badge></span>{removing === row.id && <p>Removes this dataset, alerts and notes permanently.</p>}</div><Button variant={removing === row.id ? 'destructive' : 'ghost'} size="sm" disabled={busy} onClick={() => removing === row.id ? remove(row.id) : setRemoving(row.id)}><Trash2 size={15} />{removing === row.id ? 'Confirm removal' : 'Remove'}</Button></div>) : <p>No datasets yet. Load a scenario or import an authorized sample.</p>}</div>}
    {error && <p role="alert" className="form-error source-error">{error}</p>}
  </Dialog>
}
