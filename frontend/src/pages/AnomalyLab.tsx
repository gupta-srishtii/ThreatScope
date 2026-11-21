import { useState } from 'react'
import { Beaker, BrainCircuit, FlaskConical, Info, Play, ScanLine } from 'lucide-react'
import { useWorkspace } from '../lib/workspace'
import { useResource } from '../lib/use-resource'
import type { Evaluation, Event, MLResult, ModelMetrics } from '../lib/types'
import { errorMessage, number, time } from '../lib/utils'
import { Badge, ErrorState, Loading } from '../components/ui/common'
import { Button } from '../components/ui/button'
import { EventInspector } from '../components/EventInspector'

function EvaluationCard({ name, metrics }: { name: string; metrics: ModelMetrics }) {
  return <article className="evaluation-card"><h3>{name}</h3><div className="evaluation-numbers">{[['Precision', metrics.precision], ['Recall', metrics.recall], ['F1', metrics.f1]].map(([key, value]) => <div key={key}><span>{key}</span><strong>{(Number(value) * 100).toFixed(1)}<small>%</small></strong></div>)}</div><table><caption>Event-level confusion matrix</caption><thead><tr><th scope="col">Actual / predicted</th><th scope="col">Benign</th><th scope="col">Suspicious</th></tr></thead><tbody><tr><th scope="row">Benign</th><td>{number(metrics.confusion_matrix[0][0])}</td><td>{number(metrics.confusion_matrix[0][1])}</td></tr><tr><th scope="row">Suspicious</th><td>{number(metrics.confusion_matrix[1][0])}</td><td>{number(metrics.confusion_matrix[1][1])}</td></tr></tbody></table></article>
}
export function AnomalyLab() {
  const { api, selected } = useWorkspace()
  const [result, setResult] = useState<MLResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [event, setEvent] = useState<Event | null>(null)
  const evaluation = useResource(signal => api.request<Evaluation>('/api/ml/evaluation', { signal }), [api])
  async function run() {
    setBusy(true); setError('')
    try { setResult(await api.request<MLResult>(`/api/datasets/${selected!.id}/ml`)) }
    catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  async function inspect(id: string) {
    setError('')
    try { setEvent(await api.request<Event>(`/api/datasets/${selected!.id}/events/${encodeURIComponent(id)}`)) }
    catch (e) { setError(errorMessage(e)) }
  }
  return <>
    <section className="ml-hero panel"><div className="ml-icon"><BrainCircuit size={35} /></div><div><div className="eyebrow">Experimental analysis</div><h2>A different lens on unusual activity.</h2><p>Isolation Forest scores event patterns against a separate synthetic baseline. Use candidates to ask better questions, then verify with evidence.</p><div className="ml-tags"><Badge>1,920 training events</Badge><Badge>8 causal features</Badge><Badge>Fixed seed: 42</Badge></div></div><Button onClick={run} disabled={busy}><Play size={16} />{busy ? 'Scoring events…' : result ? 'Run analysis again' : 'Run anomaly analysis'}</Button></section>
    <div className="notice"><Info size={18} /><p>Anomaly scores measure unusualness, not probability of an attack. Feature deviations provide context, not causal attribution. This synthetic-only model is not operationally validated.</p></div>
    {error && <ErrorState message={error} retry={run} />}{busy && <Loading text="Scoring the selected dataset against the independent baseline…" />}
    {result && !busy && <section className="panel anomaly-results"><div className="panel-header"><div><h2>Anomaly candidates <Badge severity="medium">{result.candidate_count}</Badge></h2><p>Up to 30 highest-scoring candidates. Positive scores cross the fixed model threshold.</p></div><ScanLine size={20} className="teal-text" /></div>{result.results.length ? <div className="table-scroll"><table><caption className="sr-only">Unusual events ranked by Isolation Forest score</caption><thead><tr><th scope="col">Time UTC</th><th scope="col">User / source</th><th scope="col">Anomaly score</th><th scope="col">Feature context</th><th scope="col">Details</th></tr></thead><tbody>{result.results.map(row => <tr key={row.event_id}><td className="mono">{time(row.timestamp)}</td><td>{row.user}<span className="cell-secondary mono">{row.source_ip}</span></td><td className="anomaly-score">+{row.score.toFixed(4)}</td><td><details className="feature-context"><summary>{row.features[0]?.feature.replaceAll('_', ' ')}</summary>{row.features.map(feature => <p key={feature.feature}><strong>{feature.feature.replaceAll('_', ' ')}</strong><br />Observed {feature.value} · baseline median {feature.baseline_median}</p>)}</details></td><td><Button variant="ghost" size="sm" onClick={() => inspect(row.event_id)}>Inspect</Button></td></tr>)}</tbody></table></div> : <p className="result-empty">No scores crossed the fixed threshold. This does not establish that all events are safe.</p>}</section>}
    <section className="panel evaluation-panel"><div className="panel-header"><div><h2>Measured model evidence</h2><p>Held-out synthetic evaluation · labels excluded from features</p></div><FlaskConical size={20} className="muted" /></div>{evaluation.loading ? <Loading /> : evaluation.error ? <ErrorState message={evaluation.error} retry={evaluation.reload} /> : <div className="evaluation-body"><div className="evaluation-context"><Beaker size={18} /><span>{number(evaluation.data!.events)} events · {evaluation.data!.datasets} held-out datasets · {evaluation.data!.positive_labels} suspicious labels</span></div><div className="evaluation-grid"><EvaluationCard name="Deterministic rules" metrics={evaluation.data!.rules} /><EvaluationCard name="Isolation Forest" metrics={evaluation.data!.isolation_forest} /></div><p className="evaluation-limitations">{evaluation.data!.limitations}</p><details className="feature-context"><summary>Reproducibility and feature protocol</summary><p>Training seeds: {evaluation.data!.training_seeds.join(', ')}. Held-out seeds: {evaluation.data!.test_seeds.join(', ')}. Model seed: 42. Threshold: negative decision function &gt; 0. Contamination: 2.5%, fixed before evaluation.</p><p>Features: hour sine/cosine, off-hours, login indicator, failure indicator, log bytes, source count in 60 seconds, source login failures in 300 seconds. Window features use only the current and preceding events.</p></details></div>}</section>
    <EventInspector event={event} close={() => setEvent(null)} />
  </>
}
