import { render, screen } from '@testing-library/react'
import App from './App'

test('renders the workspace identity and accessible navigation', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify([]))))
  render(<App />)
  expect(screen.getByRole('heading', { name: 'Security overview' })).toBeInTheDocument()
  expect(await screen.findByRole('button', { name: 'Launch demo workspace' })).toBeInTheDocument()
  expect(screen.getByRole('navigation')).toBeInTheDocument()
  vi.unstubAllGlobals()
})
