import { render, screen } from '@testing-library/react'
import App from './App'

test('renders the workspace identity', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: 'ThreatScope' })).toBeInTheDocument()
})
