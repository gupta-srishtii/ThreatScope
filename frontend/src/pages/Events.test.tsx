import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Events } from './Events'

const mocks = vi.hoisted(() => ({ request: vi.fn() }))
vi.mock('../lib/workspace', () => ({
  useWorkspace: () => ({ api: { request: mocks.request }, selected: { id: 'dataset-1' } }),
}))
const event = {
  id: 'evt-demo-1',
  timestamp: '2026-11-20T12:00:00Z',
  source_ip: '192.0.2.10',
  user: 'demo',
  host: 'sample-host',
  action: 'login',
  outcome: 'failure',
  severity: 'info',
  bytes_sent: 0,
  message: '<script>never execute</script>',
  label: null,
}
beforeEach(() => {
  mocks.request.mockImplementation(async (path: string) => ({
    items: path.includes('q=missing') ? [] : [event],
    total: path.includes('q=missing') ? 0 : 1,
    offset: 0,
    limit: 25,
  }))
})
test('filters events on the API, inspects escaped content, and returns focus on close', async () => {
  render(<Events />)
  const inspect = await screen.findByRole('button', { name: 'Inspect event evt-demo-1' })
  await userEvent.selectOptions(screen.getByLabelText('Event outcome'), 'failure')
  await waitFor(() => expect(mocks.request.mock.calls.at(-1)![0]).toContain('outcome=failure'))
  await userEvent.click(await screen.findByRole('button', { name: 'Inspect event evt-demo-1' }))
  expect(screen.getByText('<script>never execute</script>', { exact: true })).toBeVisible()
  expect(document.querySelector('script')).toBeNull()
  await userEvent.keyboard('{Escape}')
  await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  await waitFor(() =>
    expect(screen.getByRole('button', { name: inspect.getAttribute('aria-label')! })).toHaveFocus(),
  )
  await userEvent.type(screen.getByLabelText('Search events'), 'missing')
  expect(await screen.findByText('No matching events')).toBeVisible()
})
