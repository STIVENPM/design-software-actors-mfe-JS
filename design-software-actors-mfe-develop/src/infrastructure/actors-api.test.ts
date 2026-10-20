import { afterEach, describe, expect, it, vi } from 'vitest'
import { httpActorsApi } from './actors-api'
import { ApiError } from '../domain/instructor'

const assignment = {
  id: 'assignment-1',
  instructor_id: 'instructor-1',
  competency_id: 'competency-1',
  certified_at: '2026-01-15',
  is_active: true,
  created_at: '2026-01-16T00:00:00Z',
}

describe('instructor competency HTTP contract', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('uses the nested instructor route for GET and POST and returns the 201 body', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([assignment]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify(assignment), { status: 201 }))
    vi.stubGlobal('fetch', fetchMock)

    expect(await httpActorsApi.listInstructorCompetencies('instructor-1')).toEqual([assignment])
    expect(await httpActorsApi.addInstructorCompetency('instructor-1', {
      competency_id: 'competency-1', certified_at: '2026-01-15',
    })).toEqual(assignment)
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/instructors/instructor-1/competencies', expect.any(Object))
    expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/instructors/instructor-1/competencies', expect.objectContaining({
      method: 'POST', body: JSON.stringify({ competency_id: 'competency-1', certified_at: '2026-01-15' }),
    }))
  })

  it('sends the assignment ID to DELETE and accepts 204 without a JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(httpActorsApi.removeInstructorCompetency('instructor-1', 'assignment-1')).resolves.toBeUndefined()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/instructors/instructor-1/competencies/assignment-1', expect.objectContaining({ method: 'DELETE' }))
  })

  it('preserves the shared error message and HTTP 409 for inline feedback', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'CONFLICT', message: 'La competencia ya está activa.' },
    }), { status: 409 })))

    await expect(httpActorsApi.addInstructorCompetency('instructor-1', {
      competency_id: 'competency-1', certified_at: '2026-01-15',
    })).rejects.toEqual(new ApiError('La competencia ya está activa.', 409))
  })
})
