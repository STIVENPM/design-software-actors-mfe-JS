import { afterEach, describe, expect, it, vi } from 'vitest'
import { httpActorStatusApi, mockActorStatusApi } from './actor-status-api'
import { ApiError } from '../domain/instructor'

afterEach(() => vi.unstubAllGlobals())

describe('mockActorStatusApi (quemados del mockup v2)', () => {
  it('lista 4 categorías, 12 estados y 9 transiciones', async () => {
    await expect(mockActorStatusApi.listCategories()).resolves.toHaveLength(4)
    await expect(mockActorStatusApi.listStatuses()).resolves.toHaveLength(12)
    await expect(mockActorStatusApi.listTransitions()).resolves.toHaveLength(9)
  })

  it('respeta el shape de la máquina de estados', async () => {
    const [category] = await mockActorStatusApi.listCategories()
    expect(category).toMatchObject({ code: 'INSTRUCTOR_STATUS', appliesTo: 'INSTRUCTOR', isActive: true })
    const statuses = await mockActorStatusApi.listStatuses()
    expect(statuses.find(item => item.code === 'INSTR_ACTIVE')).toMatchObject({
      name: 'Activo', isInitial: true, isTerminal: false, displayOrder: 1,
    })
    const transitions = await mockActorStatusApi.listTransitions()
    expect(transitions.find(item => item.toName === 'Retirado')).toMatchObject({
      fromName: 'En formación', requiredFeature: 'LEARNER_WITHDRAW',
    })
    expect(transitions.find(item => item.toName === 'En comisión')).toMatchObject({ requiredFeature: null })
  })
})

describe('httpActorStatusApi (endpoints confirmados en actors.yaml)', () => {
  it('lista categorías y estados con fan-out por ID de catálogo', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { id: 'cat-01', code: 'INSTRUCTOR_STATUS', name: 'Estado de instructor', applies_to_entity: 'INSTRUCTOR', is_active: true },
      ]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { id: 'cat-01', code: 'INSTRUCTOR_STATUS', name: 'Estado de instructor', applies_to_entity: 'INSTRUCTOR', is_active: true },
      ]), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify([
        { code: 'INSTR_ACTIVE', name: 'Activo', is_initial: true, display_order: 1, color_hex: '#16A34A' },
        { name: 'Sin código' },
      ]), { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    await expect(httpActorStatusApi.listCategories()).resolves.toEqual([
      { id: 'cat-01', code: 'INSTRUCTOR_STATUS', name: 'Estado de instructor', description: '', appliesTo: 'INSTRUCTOR', isActive: true },
    ])
    // Sin código no sirve como estado: se descarta sin romper.
    await expect(httpActorStatusApi.listStatuses()).resolves.toEqual([
      {
        categoryCode: 'INSTRUCTOR_STATUS', categoryName: 'Estado de instructor',
        code: 'INSTR_ACTIVE', name: 'Activo', isInitial: true, isTerminal: false,
        displayOrder: 1, colorHex: '#16A34A', isActive: true,
      },
    ])
    expect(fetchMock).toHaveBeenNthCalledWith(1, '/api/v1/catalogs', expect.any(Object))
    // listStatuses refetchea catálogos (llamada 2) y luego los detalles POR ID (llamada 3).
    expect(fetchMock).toHaveBeenNthCalledWith(3, '/api/v1/catalogs/cat-01/details', expect.any(Object))
  })

  it('transiciones sin endpoint confirmado fallan explícito (DoR abierto)', async () => {
    await expect(httpActorStatusApi.listTransitions()).rejects.toEqual(
      new ApiError('Las transiciones aún no tienen endpoint confirmado en actors-service (DoR abierto).', 501),
    )
  })

  it('propaga el envelope de error del backend', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(JSON.stringify({ error: { message: 'Sin permiso.' } }), { status: 403 }),
    )
    vi.stubGlobal('fetch', fetchMock)
    await expect(httpActorStatusApi.listCategories()).rejects.toEqual(new ApiError('Sin permiso.', 403))
  })
})
