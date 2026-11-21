export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info'
export type Event = {
  id: string; timestamp: string; source_ip: string; user: string; host: string
  action: 'login' | 'file_access' | 'process_start' | 'network_connection'
  outcome: 'success' | 'failure' | 'allowed' | 'blocked'; severity: Severity
  bytes_sent: number; message: string; label: 'benign' | 'suspicious' | null
}
export type Dataset = { id: string; name: string; source: 'synthetic' | 'upload'; event_count: number; created_at: string }
export type Alert = {
  id: string; rule_id: string; title: string; severity: Severity; timestamp: string; entity: string
  explanation: string; recommendation: string; event_ids: string[]; evidence: Record<string, number | string>
  status: 'open' | 'investigating' | 'resolved'
}
export type Note = { id: string; alert_id: string; body: string; created_at: string }
export type Metrics = {
  total_events: number; total_alerts: number; open_alerts: number; unique_sources: number
  failed_logins: number; failure_rate: number; flagged_events: number; bytes_sent: number
  severity: Partial<Record<Severity, number>>; window_start: string; window_end: string; bucket_seconds: number
  timeline: { timestamp: string; events: number; flagged: number; failures: number }[]
}
export type EventPage = { items: Event[]; total: number; offset: number; limit: number }
export type MLResult = {
  candidate_count: number; results: { event_id: string; timestamp: string; user: string; source_ip: string; score: number
    features: { feature: string; value: number; baseline_median: number }[] }[]
  model: { algorithm: string; training_events: number; seed: number; contamination: number; features: string[]; threshold: number }
  limitation: string
}
export type Evaluation = {
  protocol: string; events: number; datasets: number; positive_labels: number; limitations: string
  training_seeds: number[]; test_seeds: number[]; confusion_matrix_axes: string
  rules: ModelMetrics; isolation_forest: ModelMetrics
}
export type ModelMetrics = { precision: number; recall: number; f1: number; confusion_matrix: number[][] }
