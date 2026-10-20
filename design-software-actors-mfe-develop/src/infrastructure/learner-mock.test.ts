import { expect, it } from 'vitest'
import { createMockActorsApi, DEMO_ACTIVE_ENROLLMENT_STATUS_ID, DEMO_CANCELLED_ENROLLMENT_STATUS_ID, DEMO_FICHA_ID } from './mock-actors-api'

it('keeps learner profile separate from enrollment and retains history on soft cancellation', async () => {
  const api = createMockActorsApi()
  const first = (await api.listLearners(1)).data[0]
  expect(first).not.toHaveProperty('enrollment_status_id')
  expect(first).not.toHaveProperty('enrollment_date')
  const history = await api.listLearnerFichaEnrollments(first.id)
  expect(history[0]).toMatchObject({ ficha_id: DEMO_FICHA_ID, enrollment_status_id: DEMO_ACTIVE_ENROLLMENT_STATUS_ID,
    enrollment_date: '2026-02-01', is_current: true })

  await api.cancelLearnerEnrollment(first.id)
  expect(await api.getLearner(first.id)).toEqual(first)
  expect(await api.listLearnerFichaEnrollments(first.id)).toMatchObject([
    { id: history[0].id, enrollment_status_id: DEMO_CANCELLED_ENROLLMENT_STATUS_ID, is_current: true },
  ])
})
