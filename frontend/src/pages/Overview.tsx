import { Activity, BellRing, Fingerprint, ShieldCheck, Users } from 'lucide-react'
import { motion } from 'motion/react'
import type { Page } from '../App'
import { useWorkspace } from '../lib/workspace'
import { useResource } from '../lib/use-resource'
import type { Alert, Metrics } from '../lib/types'
import { date, number, time } from '../lib/utils'
import { Badge, ErrorState, Loading } from '../components/ui/common'
import { Button } from '../components/ui/button'

export function Overview({ navigate }: { navigate: (page: Page) => void }) {
  const { api, selected, revision } = useWorkspace()
  const resource = useResource(async signal => {
    const [metrics, alerts] = await Promise.all([
      api.request<Metrics>(`/api/datasets/${selected!.id}/metrics`, { signal }),
      api.request<Alert[]>(`/api/datasets/${selected!.id}/alerts`, { signal }),
    ])
    return { metrics, alerts }
  }, [api, selected?.id, revision])
  if (resource.loading) return <Loading text="Analyzing event evidence…" />
  if (resource.error) return <ErrorState message={resource.error} retry={resource.reload} />
  const { metrics: m, alerts } = resource.data!
  const cards = [
    { title: 'Events analyzed', value: m.total_events, note: `${m.unique_sources} unique source addresses`, icon: Activity, className: 'teal' },
    { title: 'Open detections', value: m.open_alerts, note: 'Rule-based investigation leads', icon: BellRing, className: 'amber' },
    { title: 'Events with evidence', value: m.flagged_events, note: `${(m.flagged_events / m.total_events * 100).toFixed(1)}% of analyzed events`, icon: Fingerprint, className: 'rose' },
    { title: 'Failed logins', value: m.failed_logins, note: `${m.failure_rate.toFixed(1)}% of authentication events`, icon: Users, className: 'blue' },
  ]
  return <>
    <div className="analysis-context"><span className="context-dot" /><span>Analysis complete</span><span className="muted">{date(m.window_start)} · {time(m.window_start)}–{time(m.window_end)} UTC</span><span className="context-spacer" /><span className="mono">4 deterministic rules</span></div>
    <section className="metric-grid" aria-label="Security metrics">{cards.map((card, i) => <motion.article className={`metric-card metric-${card.className}`} key={card.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * .045, duration: .25 }}><div className="metric-title">{card.title}<card.icon size={17} /></div><div className="metric-value">{number(card.value)}</div><div className="metric-note">{card.note}</div><div className="metric-decoration" aria-hidden="true">{m.timeline.slice(0, 12).map((bin, index) => <span key={index} style={{ height: `${8 + (bin.events / Math.max(1, ...m.timeline.map(x => x.events))) * 25}px` }} />)}</div></motion.article>)}</section>
    <div className="overview-grid"><section className="panel"><div className="panel-header"><div><h2>Detection queue</h2><p>Prioritized signals with explainable evidence</p></div><Button size="sm" variant="ghost" onClick={() => navigate('Detections')}>View all</Button></div><div className="alert-preview-list">{alerts.length ? alerts.slice(0, 4).map(alert => <button className="alert-preview" key={alert.id} onClick={() => navigate('Detections')}><span className={`alert-glyph alert-glyph-${alert.severity}`}><BellRing size={17} /></span><div><strong>{alert.title}</strong><span className="mono">{alert.entity}</span></div><div className="alert-preview-end"><Badge severity={alert.severity}>{alert.severity}</Badge><time className="mono">{time(alert.timestamp)}</time></div></button>) : <div className="quiet-state"><ShieldCheck size={32} /><h3>No rule detections</h3><p>No configured thresholds were met. Continue reviewing context.</p></div>}</div></section>
      <section className="panel coverage-panel"><div className="panel-header"><div><h2>Detection coverage</h2><p>Transparent by design</p></div><ShieldCheck size={18} className="teal-text" /></div><div className="coverage-body"><div className="coverage-number">04<span>active rules</span></div>{[['AUTH-001', 'Repeated failed logins'], ['AUTH-002', 'Login after failures'], ['ACT-001', 'Concentrated activity'], ['AUTH-003', 'Off-hours authentication']].map(([id, title]) => <div className="coverage-row" key={id}><span className="rule-check"><ShieldCheck size={13} /></span><span>{title}</span><span className="mono">{id}</span></div>)}<div className="coverage-footnote">Signals support investigation. They do not confirm malicious activity.</div></div></section></div>
  </>
}
