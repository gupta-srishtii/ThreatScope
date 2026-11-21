import { useState } from 'react'
import { useReducedMotion } from 'motion/react'
import { Area, AreaChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartNoAxesCombined } from 'lucide-react'
import type { Metrics, Severity } from '../lib/types'
import { number, time } from '../lib/utils'

const colors: Record<Severity, string> = { critical: '#f58095', high: '#f4bc68', medium: '#dbcf91', low: '#99b5f5', info: '#7d90a8' }
const tooltipStyle = { background: '#17212d', border: '1px solid #415165', borderRadius: 8, color: '#e7edf4', fontSize: 13 }

export function Charts({ metrics: m }: { metrics: Metrics }) {
  const [series, setSeries] = useState<'events' | 'flagged'>('events')
  const [selected, setSelected] = useState<Severity | null>(null)
  const reduced = useReducedMotion()
  const severity = (Object.keys(colors) as Severity[]).map(name => ({ name, value: m.severity[name] || 0 })).filter(x => x.value)
  const selectedCount = selected ? m.severity[selected] || 0 : m.total_alerts
  return <div className="chart-grid">
    <section className="panel timeline-panel" aria-label="Event volume timeline">
      <div className="panel-header"><div><h2>Event activity</h2><p>Security signals across the analysis window</p></div><div className="segmented" aria-label="Timeline series">{(['events', 'flagged'] as const).map(key => <button key={key} aria-pressed={series === key} onClick={() => setSeries(key)}>{key === 'events' ? 'All events' : 'Rule matches'}</button>)}</div></div>
      <div className="chart-summary"><span><i className="chart-dot" />{series === 'events' ? 'Normalized events' : 'Events referenced by rules'}</span><strong>{number(series === 'events' ? m.total_events : m.flagged_events)}<span>events</span></strong><span className="mono">UTC</span></div>
      <div className="timeline-chart" role="img" aria-label={`${series === 'events' ? m.total_events : m.flagged_events} events from ${time(m.window_start)} to ${time(m.window_end)} UTC. Data table follows.`}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}><AreaChart data={m.timeline} margin={{ left: -15, top: 10, right: 20, bottom: 0 }} accessibilityLayer>
          <defs><linearGradient id="event-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#62e4c5" stopOpacity={.25} /><stop offset="100%" stopColor="#62e4c5" stopOpacity={0} /></linearGradient></defs>
          <CartesianGrid stroke="#27313f" strokeDasharray="3 5" vertical={false} />
          <XAxis dataKey="timestamp" tickFormatter={time} tick={{ fill: '#9eacbd', fontSize: 11 }} axisLine={false} tickLine={false} minTickGap={45} dy={9} />
          <YAxis allowDecimals={false} tick={{ fill: '#9eacbd', fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={tooltipStyle} labelFormatter={v => `${time(String(v))} UTC`} itemStyle={{ color: '#8cebd2' }} />
          <Area type="monotone" dataKey={series} name={series === 'events' ? 'Events' : 'Rule matches'} stroke="#62e4c5" strokeWidth={2} fill="url(#event-fill)" isAnimationActive={!reduced} animationDuration={500} activeDot={{ r: 4, stroke: '#10151d', strokeWidth: 3 }} />
        </AreaChart></ResponsiveContainer>
      </div>
      <details className="chart-data"><summary>View timeline data</summary><div className="table-scroll"><table><caption className="sr-only">Event activity by UTC bucket</caption><thead><tr><th scope="col">UTC</th><th scope="col">Events</th><th scope="col">Rule matches</th></tr></thead><tbody>{m.timeline.map(bin => <tr key={bin.timestamp}><td>{time(bin.timestamp)}</td><td>{bin.events}</td><td>{bin.flagged}</td></tr>)}</tbody></table></div></details>
    </section>
    <section className="panel severity-panel"><div className="panel-header"><div><h2>Detection severity</h2><p>Rule-generated findings</p></div><ChartNoAxesCombined size={18} className="muted" /></div>
      <div className="donut-wrap"><div className="donut-chart" aria-hidden="true"><ResponsiveContainer width="100%" height="100%" minWidth={0}><PieChart><Pie data={severity.length ? severity : [{ name: 'info', value: 1 }]} dataKey="value" nameKey="name" innerRadius={65} outerRadius={82} paddingAngle={5} stroke="none" startAngle={90} endAngle={-270} isAnimationActive={!reduced} animationDuration={500}>{(severity.length ? severity : [{ name: 'info', value: 1 }]).map(s => <Cell key={s.name} fill={colors[s.name as Severity]} opacity={selected && selected !== s.name ? .2 : 1} />)}</Pie></PieChart></ResponsiveContainer></div><div className="donut-center"><strong>{selectedCount}</strong><span>{selected || 'detections'}</span></div></div>
      <div className="severity-legend">{(Object.keys(colors) as Severity[]).filter(s => s !== 'info' || m.severity.info).map(name => <button key={name} onClick={() => setSelected(selected === name ? null : name)} aria-pressed={selected === name}><span className="legend-color" style={{ background: colors[name] }} /><span>{name}</span><strong>{m.severity[name] || 0}</strong></button>)}</div>
    </section>
  </div>
}
