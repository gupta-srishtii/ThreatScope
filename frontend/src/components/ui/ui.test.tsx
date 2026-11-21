import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from './button'
import { Dialog } from './dialog'

test('button forwards disabled state and supports keyboard activation', async () => {
  const action = vi.fn()
  const { rerender } = render(<Button onClick={action}>Investigate</Button>)
  await userEvent.tab()
  await userEvent.keyboard('{Enter}')
  expect(action).toHaveBeenCalledTimes(1)
  rerender(<Button disabled onClick={action}>Investigate</Button>)
  await userEvent.click(screen.getByRole('button'))
  expect(action).toHaveBeenCalledTimes(1)
})

test('dialog exposes its accessible name and closes on escape', async () => {
  const close = vi.fn()
  render(<Dialog open onOpenChange={close} title="Investigation" description="Review evidence"><p>Evidence</p></Dialog>)
  expect(screen.getByRole('dialog', { name: 'Investigation' })).toBeInTheDocument()
  await userEvent.keyboard('{Escape}')
  expect(close).toHaveBeenCalledWith(false)
})
