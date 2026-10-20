import { afterEach, describe, expect, it, vi } from 'vitest'
import { httpActorsApi } from './actors-api'
import { ApiError } from '../domain/instructor'

const item = {
  id: 'exception-1', instructor_id: 'instructor-1', exception_type: 'OTHER',
  start_datetime: '2030-01-01T13:00:00Z', end_datetime: '2030-01-01T14:00:00Z',
  created_at: '2026-10-10T10:00:00Z',
} as const

describe('availability HTTP contract', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses nested GET and POST routes and returns the 201 body', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify([item]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(item), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)
    expect(await httpActorsApi.listInstructorAvailabilityExceptions('instructor-1')).toEqual([item])
    const input = { exception_type: 'OTHER' as const, start_datetime: item.start_datetime, end_datetime: item.end_datetime }
    expect(await httpActorsApi.addInstructorAvailabilityException('instructor-1', input)).toEqual(item)
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/instructors/instructor-1/availability-exceptions', expect.any(Object))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/instructors/instructor-1/availability-exceptions', expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }))
  })

  it('encodes DELETE ids, accepts 204, and propagates backend rejection', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'No se puede cancelar.' } }), { status: 403 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(httpActorsApi.removeInstructorAvailabilityException('instructor-1', 'exception/1')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/instructors/instructor-1/availability-exceptions/exception%2F1', expect.objectContaining({ method: 'DELETE' }))
    await expect(httpActorsApi.removeInstructorAvailabilityException('instructor-1', 'exception-2')).rejects.toEqual(new ApiError('No se puede cancelar.', 403))
  })
})
