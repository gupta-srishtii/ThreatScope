import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AlertInvestigation } from './AlertInvestigation'
import type { Alert } from '../lib/types'

const mocks = vi.hoisted(() => ({ request: vi.fn(), invalidate: vi.fn() }))
vi.mock('../lib/workspace', () => ({ useWorkspace: () => ({ api: { request: mocks.request }, selected: { id: 'dataset' }, invalidate: mocks.invalidate }) }))
const alert: Alert = { id: 'alert', rule_id: 'AUTH-001', title: 'Repeated authentication failures', severity: 'high', timestamp: '2026-11-20T12:00:00Z', entity: 'demo', explanation: 'Five failures in five minutes.', recommendation: 'Verify with the user.', event_ids: [], evidence: { failure_count: 5 }, status: 'open' }
test('persists note text and triage status through API mutations', async () => {
  const notes: { id: string; body: string; created_at: string }[] = []
  mocks.request.mockImplementation(async (path: string, options?: RequestInit) => {
    if (options?.method === 'POST') { notes.push({ id: 'note-1', body: JSON.parse(String(options.body)).body, created_at: alert.timestamp }); return notes[0] }
    if (options?.method === 'PATCH') return { ...alert, status: 'investigating' }
    if (path.endsWith('/notes')) return [...notes]
    return { items: [], total: 0 }
  })
  render(<AlertInvestigation alert={alert} close={vi.fn()} />)
  await screen.findByText('No notes yet. Add verified context for the next analyst.')
  await userEvent.type(screen.getByLabelText('Add investigation note'), 'Verified context from synthetic logs.')
  await userEvent.click(screen.getByRole('button', { name: 'Save note' }))
  await waitFor(() => expect(screen.getByText('Verified context from synthetic logs.')).toBeVisible())
  await userEvent.selectOptions(screen.getByLabelText('Investigation status'), 'investigating')
  await userEvent.click(screen.getByRole('button', { name: 'Update status' }))
  await waitFor(() => expect(mocks.invalidate).toHaveBeenCalled())
  expect(screen.getByRole('status')).toHaveTextContent('Investigation status updated.')
})
