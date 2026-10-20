import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import LearnersPage from './LearnersPage'
import { actorsApi } from '../infrastructure/actors-api'

vi.mock('../infrastructure/actors-api', () => ({ isDemoMode: true, actorsApi: {
  listLearners: vi.fn(), createLearner: vi.fn(),
} }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(actorsApi.listLearners).mockResolvedValue({ data: [], pagination: { total_items: 0, current_page: 1, total_pages: 1 } })
  vi.mocked(actorsApi.createLearner).mockImplementation(async input => ({ ...input,
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', created_at: '2026-10-11T12:00:00',
  }))
})

it('creates a demo learner with an automatic valid user UUID and no raw UUID input', async () => {
  render(<LearnersPage />)
  fireEvent.click(await screen.findByRole('button', { name: /Nuevo aprendiz/ }))
  expect(screen.getByText(/Se asignará automáticamente un usuario ficticio/)).toBeInTheDocument()
  expect(screen.queryByLabelText('ID de usuario IAM')).not.toBeInTheDocument()
  fireEvent.change(screen.getByLabelText('Número de documento'), { target: { value: '123456' } })
  fireEvent.change(screen.getByLabelText('Nombre(s)'), { target: { value: 'Laura' } })
  fireEvent.change(screen.getByLabelText('Apellido(s)'), { target: { value: 'Rojas' } })
  fireEvent.change(screen.getByLabelText('Correo electrónico'), { target: { value: 'laura@example.test' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar aprendiz' }))
  await waitFor(() => expect(actorsApi.createLearner).toHaveBeenCalledTimes(1))
  expect(vi.mocked(actorsApi.createLearner).mock.calls[0][0].user_id)
    .toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
  expect(await screen.findByText('Aprendiz creado correctamente.')).toBeInTheDocument()
})
