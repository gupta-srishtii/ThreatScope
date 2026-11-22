import { useState } from 'react'
import { BellRing, Search, ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { useWorkspace } from '../lib/workspace'
import { useResource } from '../lib/use-resource'
import type { Alert } from '../lib/types'
import { time } from '../lib/utils'
import { Badge, Empty, ErrorState, Loading } from '../components/ui/common'
import { Button } from '../components/ui/button'
import { AlertInvestigation } from '../components/AlertInvestigation'

const rank = { critical: 0, high: 1, medium: 2, low: 3, info: 4 }
export function Detections() {
  const { api, selected, revision } = useWorkspace()
  const [active, setActive] = useState<Alert | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('all')
  const resource = useResource(
    (signal) => api.request<Alert[]>(`/api/datasets/${selected!.id}/alerts`, { signal }),
    [api, selected?.id, revision],
  )
  const alerts = (resource.data || [])
    .filter(
      (a) =>
        (status === 'all' || a.status === status) &&
        `${a.title} ${a.entity} ${a.rule_id}`.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => rank[a.severity] - rank[b.severity])
  return (
    <>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Investigation queue</h2>
            <p>Rule detections, ordered by severity. Verify before taking action.</p>
          </div>
          <ShieldCheck size={22} className="teal-text" />
        </div>
        <div className="filter-bar">
          <div className="search-field">
            <Search size={17} />
            <label className="sr-only" htmlFor="detection-search">
              Search detections
            </label>
            <input
              id="detection-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search title, user, source or rule…"
            />
          </div>
          <label className="sr-only" htmlFor="status-filter">
            Filter detection status
          </label>
          <select id="status-filter" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="investigating">Investigating</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
        {resource.loading ? (
          <Loading />
        ) : resource.error ? (
          <ErrorState message={resource.error} retry={resource.reload} />
        ) : !alerts.length ? (
          <Empty title="No matching detections">
            <p>Try another filter. No threshold matches does not guarantee a safe environment.</p>
          </Empty>
        ) : (
          <div className="detection-list">
            {alerts.map((alert, i) => (
              <motion.article
                className="detection-card"
                key={alert.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.035, 0.2) }}
              >
                <div className={`alert-glyph alert-glyph-${alert.severity}`}>
                  <BellRing size={20} />
                </div>
                <div className="detection-main">
                  <div className="detail-meta">
                    <span className="mono">{alert.rule_id}</span>
                    <Badge severity={alert.severity}>{alert.severity}</Badge>
                    <Badge>{alert.status}</Badge>
                  </div>
                  <h3>{alert.title}</h3>
                  <p>{alert.explanation}</p>
                  <span className="mono">
                    {alert.entity} · {alert.event_ids.length} evidence events ·{' '}
                    {time(alert.timestamp)} UTC
                  </span>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setActive(alert)}
                  aria-label={`Investigate ${alert.title}`}
                >
                  Investigate
                </Button>
              </motion.article>
            ))}
          </div>
        )}
      </section>
      {active && (
        <AlertInvestigation key={active.id} alert={active} close={() => setActive(null)} />
      )}
    </>
  )
}
