import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Instructor } from '../domain/instructor'
import { createMockActorsApi } from './mock-actors-api'

const seedInstructor: Instructor = {
  id: 'inst-1',
  first_name: 'Ana',
  last_name: 'Díaz',
  full_name: 'Ana Díaz',
  document_number: '100200300',
  email: 'ana@example.test',
  phone: '',
  status: 'active',
}

describe('demo instructors API', () => {
  afterEach(() => vi.useRealTimers())

  it('keeps availability exceptions in memory for one module instance only', async () => {
    const firstPage = createMockActorsApi([seedInstructor])
    const input = { exception_type: 'OTHER' as const, start_datetime: '2030-01-02T13:00:00Z', end_datetime: '2030-01-02T14:00:00Z' }
    const created = await firstPage.addInstructorAvailabilityException(seedInstructor.id, input)
    expect(await firstPage.listInstructorAvailabilityExceptions(seedInstructor.id)).toEqual([created])
    const reloadedPage = createMockActorsApi([seedInstructor])
    expect(await reloadedPage.listInstructorAvailabilityExceptions(seedInstructor.id)).toEqual([])
  })

  it('removes the selected own exception and leaves other exceptions visible', async () => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-10-11T12:00:00Z'))
    const api = createMockActorsApi([seedInstructor])
    const input = { exception_type: 'OTHER' as const, start_datetime: '2030-01-02T13:00:00Z', end_datetime: '2030-01-02T14:00:00Z' }
    const selected = await api.addInstructorAvailabilityException(seedInstructor.id, input)
    const other = await api.addInstructorAvailabilityException(seedInstructor.id, input)

    await api.removeInstructorAvailabilityException(seedInstructor.id, selected.id)
    expect(await api.listInstructorAvailabilityExceptions(seedInstructor.id)).toEqual([other])
    await expect(api.removeInstructorAvailabilityException(seedInstructor.id, selected.id)).rejects.toMatchObject({ status: 404 })
  })

  it('creates, updates, filters, and soft-deletes instructor profiles', async () => {
    const api = createMockActorsApi([seedInstructor])
    expect(await api.getInstructor(seedInstructor.id)).toEqual(seedInstructor)
    const created = await api.createInstructor({
      first_name: 'Luis',
      last_name: 'Paz',
      document_number: '987654321',
      email: 'luis@example.test',
      phone: '',
    })

    expect(created.full_name).toBe('Luis Paz')
    expect((await api.listInstructors('active'))).toHaveLength(2)

    await api.updateInstructor(created.id, {
      first_name: 'Luis Alberto',
      last_name: 'Paz',
      document_number: created.document_number,
      email: created.email,
      phone: '3001234567',
    })
    expect((await api.listInstructors('active')).find(item => item.id === created.id)?.full_name)
      .toBe('Luis Alberto Paz')

    await api.deactivateInstructor(created.id)
    expect((await api.listInstructors('active'))).toHaveLength(1)
    expect((await api.listInstructors('inactive'))[0]?.id).toBe(created.id)
  })

  it('adds instructor areas and enforces one current contract', async () => {
    const api = createMockActorsApi([seedInstructor])
    const area = await api.addArea(seedInstructor.id, 'Desarrollo de software')
    expect((await api.listAreas(seedInstructor.id))[0]?.id).toBe(area.id)

    const contract = await api.addContract(seedInstructor.id, {
      contract_type: 'STAFF',
      start_date: '2026-10-10',
      end_date: null,
      weekly_hour_limit: 40,
      is_current: true,
    })
    await expect(api.addContract(seedInstructor.id, {
      contract_type: 'CONTRACTOR',
      start_date: '2026-10-11',
      end_date: null,
      weekly_hour_limit: 48,
      is_current: true,
    })).rejects.toMatchObject({ status: 422 })

    await api.closeContract(seedInstructor.id, contract.id)
    const nextContract = await api.addContract(seedInstructor.id, {
      contract_type: 'HOURLY',
      start_date: '2026-10-11',
      end_date: null,
      weekly_hour_limit: null,
      is_current: true,
    })
    expect((await api.listContracts(seedInstructor.id)).find(item => item.id === nextContract.id)?.is_current)
      .toBe(true)
  })

  it('keeps only active competency assignments and allows reassignment after revocation', async () => {
    const api = createMockActorsApi([seedInstructor])
    const input = { competency_id: 'competency-1', certified_at: '2026-01-15' }
    const created = await api.addInstructorCompetency(seedInstructor.id, input)
    expect(created.is_active).toBe(true)
    await expect(api.addInstructorCompetency(seedInstructor.id, input)).rejects.toMatchObject({ status: 409 })
    await api.removeInstructorCompetency(seedInstructor.id, created.id)
    expect(await api.listInstructorCompetencies(seedInstructor.id)).toEqual([])
    expect((await api.addInstructorCompetency(seedInstructor.id, input)).id).not.toBe(created.id)
  })
})
