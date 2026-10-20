import { afterEach, expect, it, vi } from 'vitest'
import { httpActorsApi } from './actors-api'
import { ApiError } from '../domain/instructor'

afterEach(() => vi.unstubAllGlobals())

it('uses the backend page/limit envelope and reads enrollment data from its subresource', async () => {
  const learner = { id: 'learner-1', user_id: 'user-1', document_type: 'TI', document_number: '123',
    first_name: 'Ana', last_name: 'López', email: 'ana@example.test', created_at: '2026-01-01T12:00:00' }
  const enrollment = { id: 'enrollment-1', learner_id: 'learner-1', ficha_id: 'ficha-1', enrollment_status_id: 'status-1',
    stage: 'LECTURE', enrollment_date: '2026-02-01', is_current: true }
  const page = { data: [learner], pagination: { total_items: 1, current_page: 2, total_pages: 3 } }
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(page), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify(learner), { status: 200 }))
    .mockResolvedValueOnce(new Response(JSON.stringify([enrollment]), { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  expect(await httpActorsApi.listLearners(2)).toEqual(page)
  expect(await httpActorsApi.getLearner('learner-1')).toEqual(learner)
  expect(await httpActorsApi.listLearnerFichaEnrollments('learner-1')).toEqual([enrollment])
  expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/learners?page=2&limit=20', expect.any(Object))
  expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/learners/learner-1', expect.any(Object))
  expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/v1/learners/learner-1/ficha-enrollments', expect.any(Object))
})

it('sends enrollment_status_id on POST and uses DELETE for soft cancellation', async () => {
  const input = { ficha_id: 'ficha-1', enrollment_status_id: 'status-1', stage: 'LECTURE' as const, enrollment_date: '2026-02-01' }
  const saved = { ...input, id: 'enrollment-1', learner_id: 'learner-1', is_current: true }
  const fetchMock = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify(saved), { status: 201 }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(new Response(JSON.stringify({ error: { message: 'No hay inscripción vigente.' } }), { status: 400 }))
  vi.stubGlobal('fetch', fetchMock)
  expect(await httpActorsApi.createLearnerFichaEnrollment('learner-1', input)).toEqual(saved)
  expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/learners/learner-1/ficha-enrollments', expect.objectContaining({ method: 'POST', body: JSON.stringify(input) }))
  await expect(httpActorsApi.cancelLearnerEnrollment('learner-1')).resolves.toBeUndefined()
  expect(fetchMock).toHaveBeenNthCalledWith(2, '/api/v1/learners/learner-1', expect.objectContaining({ method: 'DELETE' }))
  await expect(httpActorsApi.cancelLearnerEnrollment('learner-1')).rejects.toEqual(new ApiError('No hay inscripción vigente.', 400))
})
