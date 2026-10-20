import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useMyAvailability } from './useMyAvailability'
import { AuthClient } from '../infrastructure/auth-client'
import { actorsApi } from '../infrastructure/actors-api'
import { ApiError } from '../domain/instructor'
import type { AvailabilityException } from '../domain/instructor-availability'

vi.mock('../infrastructure/auth-client', () => ({ AuthClient: { currentUser: vi.fn() } }))
vi.mock('../infrastructure/actors-api', () => ({ actorsApi: {
  listInstructorAvailabilityExceptions: vi.fn(),
  addInstructorAvailabilityException: vi.fn(),
  removeInstructorAvailabilityException: vi.fn(),
} }))

const ownId = '11111111-1111-4111-8111-111111111111'
const exception: AvailabilityException = {
  id: '44444444-4444-4444-8444-444444444444', instructor_id: ownId,
  exception_type: 'VACATION', start_datetime: '2030-01-02T13:00:00Z',
  end_datetime: '2030-01-03T18:00:00Z', created_at: '2026-10-10T10:00:00Z',
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-11T12:00:00Z'))
  vi.mocked(AuthClient.currentUser).mockResolvedValue({
    id: '33333333-3333-4333-8333-333333333333', email: 'instructor@sena.edu.co',
    full_name: 'Ana Instructor', actor_type: 'INSTRUCTOR', actor_id: ownId,
    roles: [{ name: 'INSTRUCTOR' }], features: [], modules: [],
  })
  vi.mocked(actorsApi.listInstructorAvailabilityExceptions).mockResolvedValue([exception])
})

afterEach(() => vi.useRealTimers())

it('uses the session instructor ID and selected exception ID, removes the card only after DELETE succeeds, and prevents duplicate requests', async () => {
  let resolveDelete!: () => void
  vi.mocked(actorsApi.removeInstructorAvailabilityException).mockImplementation(() => new Promise(resolve => { resolveDelete = resolve }))
  const { result } = renderHook(() => useMyAvailability())
  await waitFor(() => expect(result.current.exceptions).toHaveLength(1))

  let first!: Promise<boolean>
  let duplicate!: Promise<boolean>
  act(() => {
    first = result.current.cancel(exception.id)
    duplicate = result.current.cancel(exception.id)
  })
  expect(await duplicate).toBe(false)
  expect(result.current.cancelingId).toBe(exception.id)
  expect(result.current.exceptions).toHaveLength(1)
  expect(actorsApi.removeInstructorAvailabilityException).toHaveBeenCalledExactlyOnceWith(ownId, exception.id)

  await act(async () => { resolveDelete(); expect(await first).toBe(true) })
  expect(result.current.exceptions).toEqual([])
  expect(result.current.cancelingId).toBeNull()
  expect(result.current.cancelNotice).toBe('Excepción cancelada correctamente.')
})

it('keeps the exception on failure and permits retry for a server error', async () => {
  vi.mocked(actorsApi.removeInstructorAvailabilityException)
    .mockRejectedValueOnce(new ApiError('Servicio temporalmente indisponible.', 503))
    .mockResolvedValueOnce(undefined)
  const { result } = renderHook(() => useMyAvailability())
  await waitFor(() => expect(result.current.exceptions).toHaveLength(1))

  await act(async () => { expect(await result.current.cancel(exception.id)).toBe(false) })
  expect(result.current.exceptions).toHaveLength(1)
  expect(result.current.cancelError).toEqual({
    exceptionId: exception.id,
    message: 'No fue posible cancelar la excepción. Servicio temporalmente indisponible.',
    retryable: true,
  })

  await act(async () => { expect(await result.current.cancel(exception.id)).toBe(true) })
  expect(actorsApi.removeInstructorAvailabilityException).toHaveBeenCalledTimes(2)
  expect(result.current.cancelError).toBeNull()
  expect(result.current.exceptions).toEqual([])
})

it('does not request DELETE for an exception absent from the own list', async () => {
  const { result } = renderHook(() => useMyAvailability())
  await waitFor(() => expect(result.current.exceptions).toHaveLength(1))
  await act(async () => { expect(await result.current.cancel('another-exception')).toBe(false) })
  expect(actorsApi.removeInstructorAvailabilityException).not.toHaveBeenCalled()
})

it('does not request DELETE for an exception whose start is now or in the past', async () => {
  vi.mocked(actorsApi.listInstructorAvailabilityExceptions).mockResolvedValue([
    { ...exception, id: 'current', start_datetime: '2026-10-11T12:00:00Z' },
    { ...exception, id: 'past', start_datetime: '2026-10-10T12:00:00Z' },
  ])
  const { result } = renderHook(() => useMyAvailability())
  await waitFor(() => expect(result.current.exceptions).toHaveLength(2))
  await act(async () => {
    expect(await result.current.cancel('current')).toBe(false)
    expect(await result.current.cancel('past')).toBe(false)
  })
  expect(actorsApi.removeInstructorAvailabilityException).not.toHaveBeenCalled()
})

it('preserves a rejected exception and marks a permission error as non-retryable', async () => {
  vi.mocked(actorsApi.removeInstructorAvailabilityException).mockRejectedValue(new ApiError('Acceso denegado.', 403))
  const { result } = renderHook(() => useMyAvailability())
  await waitFor(() => expect(result.current.exceptions).toHaveLength(1))
  await act(async () => { expect(await result.current.cancel(exception.id)).toBe(false) })
  expect(result.current.exceptions).toEqual([exception])
  expect(result.current.cancelError).toEqual({
    exceptionId: exception.id,
    message: 'No fue posible cancelar la excepción. Acceso denegado.',
    retryable: false,
  })
})
