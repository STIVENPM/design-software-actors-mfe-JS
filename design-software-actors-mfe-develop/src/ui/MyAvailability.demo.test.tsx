import { afterEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import MyAvailability from './MyAvailability'

afterEach(() => vi.unstubAllEnvs())

it('opens and creates an exception with the real demo session and mock actors API', async () => {
  vi.stubEnv('VITE_ACTORS_API_MODE', 'mock')
  render(<MyAvailability />)
  expect(await screen.findByText('Modo demostración')).toBeInTheDocument()
  expect(await screen.findByRole('heading', { name: 'Mis excepciones' })).toBeInTheDocument()
  expect(screen.getByLabelText('Motivo')).toBeInTheDocument()
  expect(screen.getByLabelText('Fecha de inicio')).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Hora de inicio' })).toBeInTheDocument()
  expect(screen.getByLabelText('Fecha de fin')).toBeInTheDocument()
  expect(screen.getByRole('textbox', { name: 'Hora de fin' })).toBeInTheDocument()
  expect(screen.getByLabelText('Descripción (opcional)')).toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2030-01-02' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Hora de inicio' }), { target: { value: '08:00' } })
  fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: '2030-01-03' } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Hora de fin' }), { target: { value: '13:00' } })
  fireEvent.change(screen.getByLabelText('Descripción (opcional)'), { target: { value: 'QA demo' } })
  fireEvent.click(screen.getByRole('button', { name: 'Registrar excepción' }))
  expect(await screen.findByText('Excepción registrada correctamente.')).toBeInTheDocument()
  expect(await screen.findByText('QA demo')).toBeInTheDocument()
  const card = screen.getByText('QA demo').closest('article')!
  fireEvent.click(card.querySelector<HTMLButtonElement>('.availability-cancel-button')!)
  expect(screen.getByRole('dialog', { name: '¿Cancelar esta excepción?' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }))
  expect(await screen.findByText('Excepción cancelada correctamente.')).toBeInTheDocument()
  expect(screen.queryByText('QA demo')).not.toBeInTheDocument()
})
