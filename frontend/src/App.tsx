import { lazy, Suspense, useState } from 'react'
import { Activity, BellRing, Blocks, BrainCircuit, ChevronRight, CircleHelp, Database, FileText, Fingerprint,
  LayoutDashboard, LockKeyhole, PanelLeftClose, Settings2, ShieldCheck, Upload } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { Button } from './components/ui/button'
import { Dialog } from './components/ui/dialog'
import { Badge, ErrorState, Loading } from './components/ui/common'
import { WorkspaceProvider, useWorkspace } from './lib/workspace'
import { SourcesDialog } from './components/SourcesDialog'
import type { Dataset } from './lib/types'
import { errorMessage, number } from './lib/utils'

const Overview = lazy(() => import('./pages/Overview').then(m => ({ default: m.Overview })))
const Detections = lazy(() => import('./pages/Detections').then(m => ({ default: m.Detections })))
const Events = lazy(() => import('./pages/Events').then(m => ({ default: m.Events })))
const AnomalyLab = lazy(() => import('./pages/AnomalyLab').then(m => ({ default: m.AnomalyLab })))
const Reports = lazy(() => import('./pages/Reports').then(m => ({ default: m.Reports })))

const navigation = [
  { name: 'Overview', icon: LayoutDashboard }, { name: 'Events', icon: Activity },
  { name: 'Detections', icon: BellRing }, { name: 'Anomaly lab', icon: BrainCircuit },
  { name: 'Reports', icon: FileText },
]
export type Page = typeof navigation[number]['name']

function Shell() {
  const { api, datasets, selected, select, refresh, loading, error, connect } = useWorkspace()
  const [page, setPage] = useState<Page>('Overview')
  const [mobile, setMobile] = useState(false)
  const [sources, setSources] = useState(false)
  const [connection, setConnection] = useState(false)
  const [key, setKey] = useState('')
  const [busy, setBusy] = useState(false)
  const [actionError, setActionError] = useState('')
  async function launch(scenario = 'mixed') {
    setBusy(true); setActionError('')
    try {
      const dataset = await api.request<Dataset>('/api/datasets/scenario', { method: 'POST', body: JSON.stringify({ scenario }) })
      await refresh(dataset.id); setSources(false); setPage('Overview')
    } catch (e) { setActionError(errorMessage(e)) } finally { setBusy(false) }
  }
  function navigate(next: Page) { setPage(next); setMobile(false) }
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    {mobile && <button className="nav-backdrop" aria-label="Close navigation" onClick={() => setMobile(false)} />}
    <aside className={`sidebar ${mobile ? 'sidebar-open' : ''}`} aria-label="Workspace navigation">
      <a className="brand" href="#" onClick={e => { e.preventDefault(); navigate('Overview') }}><span className="brand-mark"><ShieldCheck size={25} /></span><span>ThreatScope<span className="brand-sub">SECURITY WORKSPACE</span></span></a>
      <div className="workspace-label"><span className="workspace-avatar">TS</span><div>Analyst workspace<span>Local analysis environment</span></div><LockKeyhole size={14} /></div>
      <div className="nav-label eyebrow">Workspace</div>
      <nav>{navigation.map(({ name, icon: Icon }) => <button key={name} onClick={() => navigate(name)} className={`nav-item ${page === name ? 'nav-active' : ''}`} aria-current={page === name ? 'page' : undefined}><Icon size={18} /><span>{name}</span>{name === 'Anomaly lab' && <span className="nav-tag">ML</span>}</button>)}</nav>
      <div className="nav-label eyebrow">Manage</div>
      <button className="nav-item" onClick={() => setSources(true)}><Database size={18} />Data sources</button>
      <button className="nav-item" onClick={() => setConnection(true)}><Settings2 size={18} />Connection</button>
      <div className="sidebar-bottom"><div className="defensive-card"><Fingerprint size={22} /><strong>Built for investigation</strong><p>Evidence first. Every detection has a reason.</p><span>Synthetic & authorized logs only</span></div>
        <div className="profile"><span className="profile-avatar">AN</span><div>Security analyst<span>Single workspace</span></div><ShieldCheck size={17} /></div></div>
    </aside>
    <div className="main-shell">
      <header className="topbar"><div className="breadcrumbs"><Button className="mobile-menu" variant="ghost" size="icon" aria-label="Open navigation" onClick={() => setMobile(true)}><PanelLeftClose size={19} /></Button><span className="muted">Workspace</span><ChevronRight size={14} /><span>{page}</span></div>
        <div className="topbar-right"><span className="environment-label"><LockKeyhole size={13} /> Local / authorized data</span><Button variant="ghost" size="icon" aria-label="Workspace connection" onClick={() => setConnection(true)}><CircleHelp size={18} /></Button><span className="top-avatar" aria-hidden="true">AN</span></div>
      </header>
      <main id="main" tabIndex={-1}>
        <div className="page-heading"><div><div className="eyebrow heading-eyebrow"><span className="teal-line" />Defensive operations</div><h1>{page === 'Overview' ? 'Security overview' : page === 'Events' ? 'Event explorer' : page === 'Detections' ? 'Detection center' : page === 'Anomaly lab' ? 'Anomaly lab' : 'Security reports'}</h1><p>Clarity across your security data. Context for every signal.</p></div>
          <div className="heading-actions"><Button variant="outline" onClick={() => setSources(true)}><Upload size={16} />Import events</Button><Button onClick={() => navigate('Reports')}><FileText size={16} />Export report</Button></div>
        </div>
        <div className="dataset-bar"><div className="dataset-select"><Database size={16} /><label className="sr-only" htmlFor="dataset-select">Active dataset</label><select id="dataset-select" value={selected?.id || ''} onChange={e => select(e.target.value)} disabled={!datasets.length}>{!datasets.length && <option value="">No dataset connected</option>}{datasets.map(d => <option value={d.id} key={d.id}>{d.name}</option>)}</select></div>
          <div className="dataset-meta">{selected && <><Badge severity={selected.source === 'synthetic' ? 'synthetic' : 'info'}>{selected.source === 'synthetic' ? 'Synthetic dataset' : 'Imported dataset'}</Badge><span>{number(selected.event_count)} events</span></>}<span className="snapshot-label">Snapshot analysis</span></div>
        </div>
        {loading ? <Loading /> : error ? <ErrorState message={error} retry={() => setConnection(true)} /> : !selected ? <div className="welcome panel"><div className="welcome-orbit"><ShieldCheck size={52} /></div><span className="eyebrow">Your investigation starts here</span><h2>Turn events into understanding.</h2><p>Explore a labeled synthetic environment with authentication anomalies, activity bursts, and evidence you can investigate.</p><Button onClick={() => launch()} disabled={busy}><Blocks size={17} />{busy ? 'Preparing scenario…' : 'Launch demo workspace'}</Button><button className="text-button" onClick={() => setSources(true)}>Or import authorized CSV / JSON logs</button>{actionError && <p role="alert" className="form-error">{actionError}</p>}</div> : <AnimatePresence mode="wait"><motion.div key={page + selected.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .16 }}>
          <Suspense fallback={<Loading />}>{page === 'Overview' ? <Overview navigate={navigate} /> : page === 'Detections' ? <Detections /> : page === 'Events' ? <Events /> : page === 'Anomaly lab' ? <AnomalyLab /> : <Reports />}</Suspense>
        </motion.div></AnimatePresence>}
        <footer className="workspace-footer"><span><ShieldCheck size={13} />ThreatScope · Defensive analytics</span><span>Snapshot data · All event times UTC</span><span>v0.1.0</span></footer>
      </main>
    </div>
    <SourcesDialog open={sources} onOpenChange={setSources} onLoaded={() => setPage('Overview')} />
    <Dialog open={connection} onOpenChange={setConnection} title="Workspace connection" description="Production workspaces require an API key. It is kept in memory and cleared when you reload.">
      <form onSubmit={e => { e.preventDefault(); connect(key); setKey(''); setConnection(false) }}><label className="field">Workspace API key<input type="password" autoComplete="off" value={key} onChange={e => setKey(e.target.value)} placeholder="Enter your workspace key" /></label><p className="connection-endpoint mono">Endpoint: {import.meta.env.VITE_API_BASE_URL || 'Same-origin /api'}</p><Button type="submit"><LockKeyhole size={16} />Connect workspace</Button></form>
    </Dialog>
  </div>
}

export default function App() { return <WorkspaceProvider><Shell /></WorkspaceProvider> }
