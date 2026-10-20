import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import MyAvailability from './MyAvailability'
import { AuthClient } from '../infrastructure/auth-client'
import { actorsApi } from '../infrastructure/actors-api'
import { ApiError } from '../domain/instructor'
import type { CurrentUser } from '../infrastructure/auth-client'
import type { AvailabilityException } from '../domain/instructor-availability'

vi.mock('../infrastructure/auth-client', () => ({ AuthClient: { currentUser: vi.fn() } }))
vi.mock('../infrastructure/actors-api', () => ({ actorsApi: {
  listInstructorAvailabilityExceptions: vi.fn(),
  addInstructorAvailabilityException: vi.fn(),
  removeInstructorAvailabilityException: vi.fn(),
}, isDemoMode: false }))

const ownId = '11111111-1111-4111-8111-111111111111'
const otherId = '22222222-2222-4222-8222-222222222222'
const session: CurrentUser = {
  id: '33333333-3333-4333-8333-333333333333',
  email: 'instructor@sena.edu.co',
  full_name: 'Ana Instructor',
  actor_type: 'INSTRUCTOR',
  actor_id: ownId,
  roles: [{ name: 'INSTRUCTOR' }],
  features: [],
  modules: [],
}
const exception: AvailabilityException = {
  id: '44444444-4444-4444-8444-444444444444',
  instructor_id: ownId,
  exception_type: 'VACATION',
  start_datetime: '2030-01-02T13:00:00Z',
  end_datetime: '2030-01-03T18:00:00Z',
  description: 'Descanso',
  created_at: '2026-10-10T10:00:00Z',
}

async function open() {
  render(<MyAvailability />)
  await screen.findByRole('heading', { name: 'Mi disponibilidad' })
}

function fillForm(start = '2030-01-02T08:00', end = '2030-01-03T13:00') {
  const [startDay, startHour] = start.split('T')
  const [endDay, endHour] = end.split('T')
  fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: startDay } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Hora de inicio' }), { target: { value: startHour } })
  fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: endDay } })
  fireEvent.change(screen.getByRole('textbox', { name: 'Hora de fin' }), { target: { value: endHour } })
}

describe('Mi disponibilidad', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-11T12:00:00Z'))
    vi.mocked(AuthClient.currentUser).mockResolvedValue(session)
    vi.mocked(actorsApi.listInstructorAvailabilityExceptions).mockResolvedValue([])
  })

  afterEach(() => vi.useRealTimers())

  it('resolves instructorId from actor_id rather than user id or URL', async () => {
    window.history.replaceState({}, '', `/instructor/mi-disponibilidad?instructorId=${otherId}`)
    vi.mocked(actorsApi.listInstructorAvailabilityExceptions).mockResolvedValue([exception, { ...exception, id: otherId, instructor_id: otherId }])
    await open()
    await waitFor(() => expect(actorsApi.listInstructorAvailabilityExceptions).toHaveBeenCalledWith(ownId))
    expect(await screen.findByText('Descanso')).toBeInTheDocument()
    expect(actorsApi.listInstructorAvailabilityExceptions).not.toHaveBeenCalledWith(otherId)
    expect(screen.queryByLabelText(/instructorId/i)).not.toBeInTheDocument()
  })

  it('blocks the route without the INSTRUCTOR role or actor type', async () => {
    vi.mocked(AuthClient.currentUser).mockResolvedValue({ ...session, roles: [{ name: 'COORDINATOR' }] })
    const view = render(<MyAvailability />)
    expect(await screen.findByText('Esta pantalla requiere el rol INSTRUCTOR.')).toBeInTheDocument()
    expect(actorsApi.listInstructorAvailabilityExceptions).not.toHaveBeenCalled()
    view.unmount()
    vi.mocked(AuthClient.currentUser).mockResolvedValue({ ...session, actor_type: 'USER' })
    render(<MyAvailability />)
    expect(await screen.findByText('Esta pantalla requiere el rol INSTRUCTOR.')).toBeInTheDocument()
    expect(actorsApi.listInstructorAvailabilityExceptions).not.toHaveBeenCalled()
  })

  it('blocks the route when actor_id is absent or session retrieval fails', async () => {
    vi.mocked(AuthClient.currentUser).mockResolvedValue({ ...session, actor_id: null })
    const view = render(<MyAvailability />)
    expect(await screen.findByText(/no contiene el actor_id/)).toBeInTheDocument()
    expect(actorsApi.listInstructorAvailabilityExceptions).not.toHaveBeenCalled()
    view.unmount()
    vi.mocked(AuthClient.currentUser).mockRejectedValue(new ApiError('Sesión vencida', 401))
    render(<MyAvailability />)
    expect(await screen.findByText('Sesión vencida')).toBeInTheDocument()
    expect(actorsApi.listInstructorAvailabilityExceptions).not.toHaveBeenCalled()
  })

  it('shows loading, an empty list, and API list errors with retry', async () => {
    let resolveList!: (items: AvailabilityException[]) => void
    vi.mocked(actorsApi.listInstructorAvailabilityExceptions).mockImplementationOnce(() => new Promise(resolve => { resolveList = resolve }))
      .mockRejectedValueOnce(new ApiError('No disponible', 503)).mockResolvedValueOnce([exception])
    await open()
    expect(await screen.findByText('Cargando excepciones…')).toBeInTheDocument()
    resolveList([])
    expect(await screen.findByText('No tienes excepciones registradas.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(await screen.findByText('No disponible')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Actualizar' }))
    expect(await screen.findByText('Descanso')).toBeInTheDocument()
  })

  it('uses the POST 201 body, with the session instructor ID', async () => {
    window.history.replaceState({}, '', `/instructor/mi-disponibilidad?instructorId=${otherId}`)
    vi.mocked(actorsApi.addInstructorAvailabilityException).mockResolvedValue(exception)
    await open()
    await screen.findByText('No tienes excepciones registradas.')
    fireEvent.change(screen.getByLabelText('Motivo'), { target: { value: 'VACATION' } })
    fillForm()
    fireEvent.change(screen.getByLabelText('Descripción (opcional)'), { target: { value: ' Descanso ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Registrar excepción' }))
    await waitFor(() => expect(actorsApi.addInstructorAvailabilityException).toHaveBeenCalledWith(ownId, {
      exception_type: 'VACATION',
      start_datetime: new Date(2030, 0, 2, 8, 0).toISOString(),
      end_datetime: new Date(2030, 0, 3, 13, 0).toISOString(),
      description: 'Descanso',
    }))
    expect(await screen.findByText('Excepción registrada correctamente.')).toBeInTheDocument()
    const entry = screen.getByRole('article', { name: 'Vacaciones' })
    expect(within(entry).getByRole('heading', { name: 'Vacaciones' })).toBeInTheDocument()
    expect(within(entry).getByText('Tiempo libre')).toBeInTheDocument()
    expect(within(entry).getByText('Descanso')).toBeInTheDocument()
    expect(entry.querySelectorAll('time')).toHaveLength(2)
    expect(entry.querySelectorAll('time')[0]).toHaveAttribute('datetime', exception.start_datetime)
    expect(entry.querySelectorAll('time')[1]).toHaveAttribute('datetime', exception.end_datetime)
    expect(actorsApi.addInstructorAvailabilityException).not.toHaveBeenCalledWith(otherId, expect.anything())
  })

  it('rejects an inverted range and avoids duplicate submissions', async () => {
    let resolveCreate!: (item: AvailabilityException) => void
    vi.mocked(actorsApi.addInstructorAvailabilityException).mockImplementation(() => new Promise(resolve => { resolveCreate = resolve }))
    await open()
    fillForm('2030-01-03T13:00', '2030-01-02T08:00')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar excepción' }))
    expect(await screen.findByText('La fecha y hora de fin deben ser posteriores al inicio.')).toBeInTheDocument()
    for (const control of [
      screen.getByLabelText('Fecha de inicio'),
      screen.getByRole('textbox', { name: 'Hora de inicio' }),
      screen.getByLabelText('Fecha de fin'),
      screen.getByRole('textbox', { name: 'Hora de fin' }),
    ]) {
      expect(control).toHaveAttribute('aria-invalid', 'true')
      expect(control).toHaveAttribute('aria-describedby', 'availability-range-error')
    }
    expect(actorsApi.addInstructorAvailabilityException).not.toHaveBeenCalled()
    fillForm()
    const form = screen.getByRole('button', { name: 'Registrar excepción' }).closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    expect(actorsApi.addInstructorAvailabilityException).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Registrando…' })).toBeDisabled()
    resolveCreate(exception)
    expect(await screen.findByText('Excepción registrada correctamente.')).toBeInTheDocument()
  })

  it('keeps the form and list on POST rejection or a mismatched response', async () => {
    vi.mocked(actorsApi.addInstructorAvailabilityException).mockRejectedValueOnce(new ApiError('Acceso denegado', 403))
      .mockResolvedValueOnce({ ...exception, instructor_id: otherId })
    await open()
    fillForm()
    fireEvent.click(screen.getByRole('button', { name: 'Registrar excepción' }))
    expect(await screen.findByText('Acceso denegado')).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha de inicio')).toHaveValue('2030-01-02')
    expect(screen.getByRole('textbox', { name: 'Hora de inicio' })).toHaveValue('08:00')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar excepción' }))
    expect(await screen.findByText('La respuesta no corresponde al instructor de la sesión.')).toBeInTheDocument()
    expect(screen.queryByText('Descanso')).not.toBeInTheDocument()
  })

  it('offers cancellation only when start_datetime is strictly after the current instant', async () => {
    vi.mocked(actorsApi.listInstructorAvailabilityExceptions).mockResolvedValue([
      exception,
      { ...exception, id: 'past', start_datetime: '2020-01-01T00:00:00Z', end_datetime: '2020-01-02T00:00:00Z' },
      { ...exception, id: 'current', start_datetime: '2026-10-11T11:00:00Z', end_datetime: '2026-10-11T13:00:00Z' },
      { ...exception, id: 'boundary', start_datetime: '2026-10-11T12:00:00Z', end_datetime: '2026-10-12T12:00:00Z' },
      { ...exception, id: 'offset-future', start_datetime: '2026-10-11T07:00:01-05:00', end_datetime: '2026-10-12T07:00:01-05:00' },
    ])
    await open()
    await waitFor(() => expect(screen.getAllByText('Descanso')).toHaveLength(5))
    expect(screen.getAllByRole('button', { name: 'Cancelar' })).toHaveLength(2)
    for (const id of ['past', 'current', 'boundary']) {
      const card = document.getElementById(`availability-exception-${id}`)?.closest('article')
      expect(card).not.toBeNull()
      expect(within(card!).queryByRole('button', { name: 'Cancelar' })).not.toBeInTheDocument()
    }
    expect(actorsApi.removeInstructorAvailabilityException).not.toHaveBeenCalled()
  })

  it('confirms a future cancellation, shows progress, and removes the card after success', async () => {
    let resolveDelete!: () => void
    vi.mocked(actorsApi.listInstructorAvailabilityExceptions).mockResolvedValue([exception])
    vi.mocked(actorsApi.removeInstructorAvailabilityException).mockImplementation(() => new Promise(resolve => { resolveDelete = resolve }))
    await open()
    const card = await screen.findByRole('article', { name: 'Vacaciones' })
    fireEvent.click(within(card).getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByRole('dialog', { name: '¿Cancelar esta excepción?' })).toBeInTheDocument()
    expect(actorsApi.removeInstructorAvailabilityException).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'No, conservar' }))
    expect(actorsApi.removeInstructorAvailabilityException).not.toHaveBeenCalled()
    fireEvent.click(within(card).getByRole('button', { name: 'Cancelar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }))
    expect(actorsApi.removeInstructorAvailabilityException).toHaveBeenCalledExactlyOnceWith(ownId, exception.id)
    expect(within(card).getByRole('button', { name: 'Cancelando…' })).toBeDisabled()
    expect(card).toBeInTheDocument()
    resolveDelete()
    expect(await screen.findByText('Excepción cancelada correctamente.')).toBeInTheDocument()
    expect(screen.queryByRole('article', { name: 'Vacaciones' })).not.toBeInTheDocument()
  })

  it('keeps a future exception on DELETE failure and confirms a retry', async () => {
    vi.mocked(actorsApi.listInstructorAvailabilityExceptions).mockResolvedValue([exception])
    vi.mocked(actorsApi.removeInstructorAvailabilityException)
      .mockRejectedValueOnce(new ApiError('Servicio temporalmente indisponible.', 503))
      .mockResolvedValueOnce(undefined)
    await open()
    const card = await screen.findByRole('article', { name: 'Vacaciones' })
    fireEvent.click(within(card).getByRole('button', { name: 'Cancelar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }))
    expect(await within(card).findByRole('alert')).toHaveTextContent('Servicio temporalmente indisponible.')
    expect(card).toBeInTheDocument()
    fireEvent.click(within(card).getByRole('button', { name: 'Reintentar cancelación' }))
    expect(actorsApi.removeInstructorAvailabilityException).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Sí, cancelar' }))
    expect(await screen.findByText('Excepción cancelada correctamente.')).toBeInTheDocument()
    expect(actorsApi.removeInstructorAvailabilityException).toHaveBeenCalledTimes(2)
  })

  it('shows compact labels with distinct accessible names and focusable controls', async () => {
    await open()
    const group = screen.getByRole('group', { name: 'Rango de la excepción' })
    expect(within(group).getByRole('heading', { name: 'Inicio' })).toBeInTheDocument()
    expect(within(group).getByRole('heading', { name: 'Fin' })).toBeInTheDocument()
    expect(within(group).getAllByText('Fecha')).toHaveLength(2)
    expect(within(group).getAllByText('Hora (24 h)')).toHaveLength(2)
    expect(within(group).queryByText(/DD\/MM\/AAAA/)).not.toBeInTheDocument()
    const startDate = within(group).getByLabelText('Fecha de inicio')
    const startTime = within(group).getByRole('textbox', { name: 'Hora de inicio' })
    const endDate = within(group).getByLabelText('Fecha de fin')
    const endTime = within(group).getByRole('textbox', { name: 'Hora de fin' })
    expect(startDate).toHaveAttribute('type', 'date')
    expect(endDate).toHaveAttribute('type', 'date')
    expect(startTime).toHaveAttribute('type', 'text')
    expect(startTime).toHaveAttribute('inputmode', 'numeric')
    expect(endTime).toHaveAttribute('placeholder', 'HH:mm')
    expect(document.querySelector('input[type="datetime-local"]')).toBeNull()
    fireEvent.change(startTime, { target: { value: '0830' } })
    expect(startTime).toHaveValue('08:30')
    for (const control of [startDate, startTime, endDate, endTime]) {
      expect(control).not.toHaveAttribute('aria-describedby')
      control.focus()
      expect(control).toHaveFocus()
    }
  })

  it('shows category and dates while omitting an absent description', async () => {
    vi.mocked(actorsApi.listInstructorAvailabilityExceptions).mockResolvedValue([{ ...exception, description: null, exception_type: 'SICK_LEAVE' }])
    await open()
    const entry = await screen.findByRole('article', { name: 'Incapacidad' })
    expect(within(entry).getByText('Salud')).toBeInTheDocument()
    expect(within(entry).getByText('Inicio')).toBeInTheDocument()
    expect(within(entry).getByText('Fin')).toBeInTheDocument()
    expect(entry.querySelectorAll('time')).toHaveLength(2)
    expect(within(entry).queryByText('Descripción:')).not.toBeInTheDocument()
  })

  it('rejects invalid 24-hour time and an equal start/end without posting', async () => {
    await open()
    fillForm('2030-01-02T08:00', '2030-01-02T25:00')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar excepción' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Escribe ambas horas en formato HH:mm de 24 horas.')
    expect(actorsApi.addInstructorAvailabilityException).not.toHaveBeenCalled()
    fillForm('2030-01-02T08:00', '2030-01-02T08:00')
    fireEvent.click(screen.getByRole('button', { name: 'Registrar excepción' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('La fecha y hora de fin deben ser posteriores al inicio.')
    expect(actorsApi.addInstructorAvailabilityException).not.toHaveBeenCalled()
  })
})
