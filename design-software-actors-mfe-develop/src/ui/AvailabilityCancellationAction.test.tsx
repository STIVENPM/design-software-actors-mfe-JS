import { expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import AvailabilityCancellationAction from './AvailabilityCancellationAction'

it('shows the cancellation action, busy state, and retryable error', () => {
  const onCancel = vi.fn()
  const view = render(<AvailabilityCancellationAction exceptionId="exception-1" busy={false} disabled={false} onCancel={onCancel} />)
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.getByRole('dialog', { name: '¿Cancelar esta excepción?' })).toBeInTheDocument()
  expect(onCancel).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'No, conservar' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(onCancel).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }))
  expect(onCancel).toHaveBeenCalledWith('exception-1')

  view.rerender(<AvailabilityCancellationAction exceptionId="exception-1" busy disabled onCancel={onCancel} />)
  expect(screen.getByRole('button', { name: 'Cancelando…' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Cancelando…' }))
  expect(onCancel).toHaveBeenCalledTimes(1)

  view.rerender(<AvailabilityCancellationAction exceptionId="exception-1" busy={false} disabled={false} error={{ message: 'No fue posible cancelar la excepción.', retryable: true }} onCancel={onCancel} />)
  expect(screen.getByRole('alert')).toHaveTextContent('No fue posible cancelar la excepción.')
  fireEvent.click(screen.getByRole('button', { name: 'Reintentar cancelación' }))
  expect(onCancel).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }))
  expect(onCancel).toHaveBeenCalledTimes(2)
})

it('returns focus and cancels the confirmation with Escape', () => {
  const onCancel = vi.fn()
  render(<AvailabilityCancellationAction exceptionId="exception-1" busy={false} disabled={false} onCancel={onCancel} />)
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  const dialog = screen.getByRole('dialog', { name: '¿Cancelar esta excepción?' })
  expect(screen.getByRole('button', { name: 'No, conservar' })).toHaveFocus()
  fireEvent.keyDown(dialog, { key: 'Escape' })
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(onCancel).not.toHaveBeenCalled()
})

it('does not offer retry after a non-retryable rejection', () => {
  render(<AvailabilityCancellationAction exceptionId="exception-1" busy={false} disabled={false} error={{ message: 'Acceso denegado.', retryable: false }} onCancel={vi.fn()} />)
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: 'Reintentar cancelación' })).not.toBeInTheDocument()
  expect(screen.getByRole('alert')).toHaveTextContent('Acceso denegado.')
})
